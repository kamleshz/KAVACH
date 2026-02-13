import SingleUsePlasticChecklistModel from "../models/singleUsePlasticChecklist.model.js";

export const getSingleUsePlasticChecklistController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;

        const doc = await SingleUsePlasticChecklistModel.findOne({ client: clientId, type, itemId });

        let data = [];
        if (doc) {
            // Combine new arrays if they exist, otherwise fallback to rows
            if ((doc.supItems && doc.supItems.length > 0) || 
                (doc.compostableItems && doc.compostableItems.length > 0) || 
                (doc.misrepresentationItems && doc.misrepresentationItems.length > 0) || 
                (doc.awarenessItems && doc.awarenessItems.length > 0)) {
                
                data = [
                    ...(doc.supItems || []),
                    ...(doc.compostableItems || []),
                    ...(doc.misrepresentationItems || []),
                    ...(doc.awarenessItems || [])
                ];
            } else {
                data = doc.rows || [];
            }
        }

        return res.status(200).json({
            success: true,
            data: data,
            hasDoc: !!doc
        });
    } catch (error) {
        console.error("Error fetching SUP checklist:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching checklist data"
        });
    }
};

export const saveSingleUsePlasticChecklistController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId, rows } = req.body;

        // Split rows into categories
        const supItems = rows.filter(r => !['CompostableQuestion', 'CompostableDetail', 'MisrepresentationQuestion', 'MisrepresentationDetail', 'AwarenessQuestion', 'AwarenessDetail'].includes(r.areaName));
        const compostableItems = rows.filter(r => ['CompostableQuestion', 'CompostableDetail'].includes(r.areaName));
        const misrepresentationItems = rows.filter(r => ['MisrepresentationQuestion', 'MisrepresentationDetail'].includes(r.areaName));
        const awarenessItems = rows.filter(r => ['AwarenessQuestion', 'AwarenessDetail'].includes(r.areaName));

        let doc = await SingleUsePlasticChecklistModel.findOne({ client: clientId, type, itemId });

        if (doc) {
            doc.supItems = supItems;
            doc.compostableItems = compostableItems;
            doc.misrepresentationItems = misrepresentationItems;
            doc.awarenessItems = awarenessItems;
            doc.rows = []; // Clear rows to migrate to new structure
            await doc.save();
        } else {
            doc = new SingleUsePlasticChecklistModel({
                client: clientId,
                type,
                itemId,
                supItems,
                compostableItems,
                misrepresentationItems,
                awarenessItems,
                rows: []
            });
            await doc.save();
        }

        // Return combined rows for frontend consistency
        const savedRows = [
            ...doc.supItems,
            ...doc.compostableItems,
            ...doc.misrepresentationItems,
            ...doc.awarenessItems
        ];

        return res.status(200).json({
            success: true,
            message: "Checklist saved successfully",
            data: savedRows
        });
    } catch (error) {
        console.error("Error saving SUP checklist:", error);
        return res.status(500).json({
            success: false,
            message: "Error saving checklist data"
        });
    }
};

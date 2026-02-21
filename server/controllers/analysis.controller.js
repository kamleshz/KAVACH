import fs from 'fs';
import path from 'path';
import AnalysisService from '../services/analysis.service.js';

export const analyzePlasticPrePost = async (req, res) => {
    try {
        if (!req.files || !req.files.salesFile) {
            return res.status(400).json({ message: "At least 'salesFile' is required." });
        }

        const { clientId, type, itemId } = req.body;
        
        const salesFile = req.files.salesFile[0];
        const purchaseFile = req.files.purchaseFile ? req.files.purchaseFile[0] : null;
        const outputDir = path.join(process.cwd(), 'temp_analysis_output');

        // Use Service Layer
        const result = await AnalysisService.runPlasticAnalysis(
            salesFile.path, 
            purchaseFile ? purchaseFile.path : null, 
            outputDir, 
            { clientId, type, itemId }
        );

        // Cleanup input files
        try {
            fs.unlinkSync(salesFile.path);
            if (purchaseFile) fs.unlinkSync(purchaseFile.path);
        } catch (cleanupErr) {
            console.error("Error cleaning up input files:", cleanupErr);
        }

        // Return the result
        res.status(200).json({
            success: true,
            data: result.summary.portal_summary,
            full_summary: result.summary,
            output_file: result.output_file
        });

    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ message: error.message || "Error processing analysis files" });
    }
};

export const getPlasticAnalysisController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;

        const analysisData = await AnalysisService.getPlasticAnalysis(clientId, type, itemId);

        if (!analysisData) {
            return res.status(200).json({
                success: true,
                data: null,
                message: "No analysis data found"
            });
        }

        res.status(200).json({
            success: true,
            ...analysisData
        });

    } catch (error) {
        console.error("Get Analysis Error:", error);
        res.status(500).json({ message: error.message || "Error fetching analysis data" });
    }
};

export const saveSalesAnalysisController = async (req, res) => {
    try {
        const { clientId, type, itemId, summary, rows, targetTables } = req.body;

        if (!clientId || !type || !itemId || !summary || !rows) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const result = await AnalysisService.saveSalesAnalysis(clientId, type, itemId, { summary, rows, targetTables });

        res.status(200).json({
            success: true,
            message: "Sales analysis saved successfully",
            data: result
        });
    } catch (error) {
        console.error("Save Sales Analysis Error:", error);
        res.status(500).json({ message: error.message || "Error saving sales analysis" });
    }
};

export const getSalesAnalysisController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;

        const analysisData = await AnalysisService.getSalesAnalysis(clientId, type, itemId);

        if (!analysisData) {
            return res.status(200).json({
                success: true,
                data: null,
                message: "No sales analysis data found"
            });
        }

        res.status(200).json({
            success: true,
            ...analysisData
        });

    } catch (error) {
        console.error("Get Sales Analysis Error:", error);
        res.status(500).json({ message: error.message || "Error fetching sales analysis data" });
    }
};

export const savePurchaseAnalysisController = async (req, res) => {
    try {
        const { clientId, type, itemId, summary, rows } = req.body;

        if (!clientId || !type || !itemId || !summary || !rows) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const result = await AnalysisService.savePurchaseAnalysis(clientId, type, itemId, { summary, rows });

        res.status(200).json({
            success: true,
            message: "Purchase analysis saved successfully",
            data: result
        });
    } catch (error) {
        console.error("Save Purchase Analysis Error:", error);
        res.status(500).json({ message: error.message || "Error saving purchase analysis" });
    }
};

export const getPurchaseAnalysisController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;

        const analysisData = await AnalysisService.getPurchaseAnalysis(clientId, type, itemId);

        if (!analysisData) {
            return res.status(200).json({
                success: true,
                data: null,
                message: "No purchase analysis data found"
            });
        }

        res.status(200).json({
            success: true,
            ...analysisData
        });

    } catch (error) {
        console.error("Get Purchase Analysis Error:", error);
        res.status(500).json({ message: error.message || "Error fetching purchase analysis data" });
    }
};

export const generatePlasticComplianceReportController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;
        const userId = req.userId;

        if (!clientId || !type || !itemId) {
            return res.status(400).json({ message: "Missing required parameters: clientId, type, itemId" });
        }

        const pdfBuffer = await AnalysisService.generatePlasticComplianceReport(clientId, type, itemId, userId);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Plastic_Compliance_Report_${clientId}.pdf"`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);

    } catch (error) {
        console.error("Generate Report Error:", error);
        console.error(error.stack); // Log stack trace for debugging
        
        // Ensure error response is JSON and includes details for debugging
        res.status(500).json({ 
            message: error.message || "Error generating report",
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            details: "Please check Render logs for 'Puppeteer Launch Error'"
        });
    }
};

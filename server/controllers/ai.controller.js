import dotenv from 'dotenv';
dotenv.config();

export const analyzeTableController = async (req, res) => {
    try {
        const { tableData, context, prompt } = req.body;

        if (!tableData) {
            return res.status(400).json({
                message: "Table data is required",
                error: true,
                success: false
            });
        }

        // Check for API Key (OpenAI or Gemini)
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        let analysisResult = "";

        if (OPENAI_API_KEY) {
            // Implementation for OpenAI
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o", // or gpt-3.5-turbo
                        messages: [
                            {
                                role: "system",
                                content: "You are an expert data analyst for EPR (Extended Producer Responsibility) compliance. Analyze the provided table data and provide insights, anomalies, and compliance recommendations. Keep it concise and professional."
                            },
                            {
                                role: "user",
                                content: `Context: ${context || 'SKU Compliance Data'}\n\nTask: ${prompt || 'Analyze this table for compliance issues.'}\n\nData: ${JSON.stringify(tableData)}`
                            }
                        ]
                    })
                });
                
                const data = await response.json();
                if (data.choices && data.choices.length > 0) {
                    analysisResult = data.choices[0].message.content;
                } else {
                    throw new Error(data.error?.message || "Failed to get response from OpenAI");
                }
            } catch (apiError) {
                console.error("AI API Error:", apiError);
                analysisResult = "Error communicating with AI service. Please check server logs.";
            }
        } else if (GEMINI_API_KEY) {
             // Implementation for Gemini could go here
             analysisResult = "Gemini integration pending. Please configure OpenAI for now.";
        } else {
            // Mock Response for Demonstration
            analysisResult = `
**[DEMO MODE] AI Analysis Insight**

*Note: To enable real AI analysis, please add OPENAI_API_KEY to your server .env file.*

Based on the provided data (${Array.isArray(tableData) ? tableData.length : 0} rows), here are some potential observations:

1. **Compliance Status**: 
   - Several items are marked as "Non-Compliant". Review "Partially Compliant" items for missing documentation.
   
2. **Polymer Usage**:
   - High usage of PET detected. Ensure recycling targets (RC%) meet the statutory 30-50% range.
   
3. **Data Quality**:
   - Some rows have missing "Component Polymer" values. Please fill these to ensure accurate EPR calculation.

*This is a simulated response to demonstrate the UI flow.*
            `;
        }

        return res.status(200).json({
            message: "Analysis complete",
            data: { analysis: analysisResult },
            success: true,
            error: false
        });

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return res.status(500).json({
            message: error.message || "Internal Server Error",
            error: true,
            success: false
        });
    }
};

import PlasticAnalysisService from './analysis/plasticAnalysis.service.js';
import SalesAnalysisService from './analysis/salesAnalysis.service.js';
import PurchaseAnalysisService from './analysis/purchaseAnalysis.service.js';
import ReportGeneratorService from './analysis/reportGenerator.service.js';

class AnalysisService {
    static async runPlasticAnalysis(...args) { return PlasticAnalysisService.runPlasticAnalysis(...args); }
    static async getPlasticAnalysis(...args) { return PlasticAnalysisService.getPlasticAnalysis(...args); }
    static async saveAnalysisResult(...args) { return PlasticAnalysisService.saveAnalysisResult(...args); }
    static async calculatePrePost(...args) { return PlasticAnalysisService.calculatePrePost(...args); }
    static getNextFinancialYear(...args) { return PlasticAnalysisService.getNextFinancialYear(...args); }
    static generateAuditorInsights(...args) { return PlasticAnalysisService.generateAuditorInsights(...args); }
    
    static async saveSalesAnalysis(...args) { return SalesAnalysisService.saveSalesAnalysis(...args); }
    static async getSalesAnalysis(...args) { return SalesAnalysisService.getSalesAnalysis(...args); }
    
    static async savePurchaseAnalysis(...args) { return PurchaseAnalysisService.savePurchaseAnalysis(...args); }
    static async getPurchaseAnalysis(...args) { return PurchaseAnalysisService.getPurchaseAnalysis(...args); }
    
    static async generatePlasticComplianceReport(...args) { return ReportGeneratorService.generatePlasticComplianceReport(...args); }
    static async generatePlasticSummaryReport(clientId, type, itemId, userId) {
        return ReportGeneratorService.generatePlasticComplianceReport(
            clientId,
            type,
            itemId,
            userId,
            { templateName: 'plasticSummaryReport.hbs' }
        );
    }
}

export default AnalysisService;

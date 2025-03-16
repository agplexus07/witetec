export declare class MerchantsService {
    register(merchantData: any): Promise<any>;
    getMerchantById(id: string): Promise<any>;
    updateMerchantStatus(id: string, status: 'approved' | 'rejected', rejectionReason?: string): Promise<any>;
    updateMerchantFee(id: string, feePercentage: number): Promise<any>;
    uploadDocument(merchantId: string, documentType: string, file: Express.Multer.File): Promise<any>;
    getDashboardStats(merchantId: string): Promise<{
        pixToday: number;
        pix30Days: number;
        totalTransactions: number;
        successRate: number;
        averageTicket: number;
        chargebackRate: number;
        availableBalance: any;
    }>;
    private getFileExtension;
}

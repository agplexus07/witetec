export declare class PixService {
    createPixCharge(data: {
        amount: number;
        merchantId: string;
        description?: string;
        transactionId: string;
    }): Promise<{
        qrCode: any;
        qrCodeImage: any;
        paymentLinkUrl: any;
        expiresAt: string;
    }>;
    getPixStatus(transactionId: string): Promise<{
        status: any;
        paidAmount: any;
        paidAt: any;
    }>;
    refundPix(data: {
        transactionId: string;
        amount: number;
        reason?: string;
    }): Promise<any>;
}

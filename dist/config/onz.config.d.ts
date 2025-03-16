export declare const onzClient: {
    pix: {
        create: (data: {
            amount: number;
            correlationID: string;
            description?: string;
            expiresIn?: number;
        }) => Promise<{
            qrCode: any;
            qrCodeImage: any;
            paymentLinkUrl: any;
            expiresAt: string;
        }>;
        status: (transactionId: string) => Promise<{
            status: any;
            paidAmount: any;
            paidAt: any;
        }>;
        refund: (data: {
            correlationID: string;
            amount: number;
            reason?: string;
        }) => Promise<any>;
    };
};

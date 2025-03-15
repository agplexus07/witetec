export declare class CreateTransactionDto {
    amount: number;
    merchant_id: string;
    pix_key: string;
    description?: string;
    transaction_id: string;
}
export declare class UpdateTransactionStatusDto {
    status: 'completed' | 'failed' | 'chargeback';
}

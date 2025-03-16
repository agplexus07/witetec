export declare class CreateWithdrawalDto {
    amount: number;
    merchant_id: string;
    pix_key: string;
    notes?: string;
}
export declare class UpdateWithdrawalStatusDto {
    status: 'processing' | 'completed' | 'failed';
    notes?: string;
}

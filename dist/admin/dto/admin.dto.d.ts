export declare class UpdateMerchantFeeDto {
    fee_percentage: number;
}
export declare class UpdateMerchantStatusDto {
    status: 'approved' | 'rejected';
    rejection_reason?: string;
}
export declare class DateRangeDto {
    start_date: string;
    end_date: string;
}

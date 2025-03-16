export declare class CreateMerchantDto {
    company_name: string;
    trading_name?: string;
    cnpj: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
}
export declare class UpdateMerchantFeeDto {
    feePercentage: number;
}
export declare class UpdateMerchantStatusDto {
    status: 'approved' | 'rejected';
    rejectionReason?: string;
}
export declare class UploadDocumentDto {
    type: string;
    file: any;
}

import { UpdateMerchantFeeDto, UpdateMerchantStatusDto, DateRangeDto } from './dto/admin.dto';
export declare class AdminService {
    getAllMerchants(): Promise<any[]>;
    getMerchantDetails(merchantId: string): Promise<{
        merchant: any;
        stats: {
            today_volume: number;
            thirty_days_volume: number;
            chargeback_count: number;
            available_balance: any;
        };
    }>;
    updateMerchantFee(merchantId: string, data: UpdateMerchantFeeDto): Promise<any>;
    updateMerchantStatus(merchantId: string, data: UpdateMerchantStatusDto): Promise<any>;
    getChargebacks(dateRange?: DateRangeDto): Promise<any[]>;
    getDashboardStats(): Promise<{
        today_volume: any;
        today_revenue: any;
        total_chargebacks: number;
        pending_merchants: number;
    }>;
}

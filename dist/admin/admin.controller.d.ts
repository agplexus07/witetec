import { AdminService } from './admin.service';
import { UpdateMerchantFeeDto, UpdateMerchantStatusDto, DateRangeDto } from './dto/admin.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getDashboardStats(): Promise<{
        today_volume: any;
        today_revenue: any;
        total_chargebacks: number;
        pending_merchants: number;
    }>;
    getAllMerchants(): Promise<any[]>;
    getMerchantDetails(id: string): Promise<{
        merchant: any;
        stats: {
            today_volume: number;
            thirty_days_volume: number;
            chargeback_count: number;
            available_balance: any;
        };
    }>;
    updateMerchantFee(id: string, data: UpdateMerchantFeeDto): Promise<any>;
    updateMerchantStatus(id: string, data: UpdateMerchantStatusDto): Promise<any>;
    getChargebacks(dateRange: DateRangeDto): Promise<any[]>;
}

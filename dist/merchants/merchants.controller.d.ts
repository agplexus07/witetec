import { MerchantsService } from './merchants.service';
import { CreateMerchantDto, UpdateMerchantFeeDto, UpdateMerchantStatusDto, UploadDocumentDto } from './dto/merchant.dto';
export declare class MerchantsController {
    private readonly merchantsService;
    constructor(merchantsService: MerchantsService);
    register(merchantData: CreateMerchantDto): Promise<any>;
    getMerchant(id: string): Promise<any>;
    getDashboard(id: string): Promise<{
        pixToday: number;
        pix30Days: number;
        totalTransactions: number;
        successRate: number;
        averageTicket: number;
        chargebackRate: number;
        availableBalance: any;
    }>;
    updateStatus(id: string, data: UpdateMerchantStatusDto): Promise<any>;
    updateFee(id: string, data: UpdateMerchantFeeDto): Promise<any>;
    uploadDocument(id: string, data: UploadDocumentDto, file: Express.Multer.File): Promise<any>;
}

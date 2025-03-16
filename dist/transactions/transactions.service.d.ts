import { CreateTransactionDto, UpdateTransactionStatusDto } from './dto/transaction.dto';
import { PixService } from '../pix/pix.service';
export declare class TransactionsService {
    private readonly pixService;
    constructor(pixService: PixService);
    createTransaction(data: CreateTransactionDto): Promise<any>;
    updateTransactionStatus(id: string, data: UpdateTransactionStatusDto): Promise<any>;
    checkTransactionStatus(transactionId: string): Promise<{
        status: any;
        paidAmount: any;
        paidAt: any;
    }>;
    private updateMerchantBalance;
    getMerchantTransactions(merchantId: string): Promise<any[]>;
}

import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, UpdateTransactionStatusDto } from './dto/transaction.dto';
export declare class TransactionsController {
    private readonly transactionsService;
    constructor(transactionsService: TransactionsService);
    createTransaction(data: CreateTransactionDto): Promise<any>;
    updateStatus(id: string, data: UpdateTransactionStatusDto): Promise<any>;
    getMerchantTransactions(merchantId: string): Promise<any[]>;
}

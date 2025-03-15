import { CreateTransactionDto, UpdateTransactionStatusDto } from './dto/transaction.dto';
export declare class TransactionsService {
    createTransaction(data: CreateTransactionDto): Promise<any>;
    updateTransactionStatus(id: string, data: UpdateTransactionStatusDto): Promise<any>;
    private updateMerchantBalance;
    getMerchantTransactions(merchantId: string): Promise<any[]>;
}

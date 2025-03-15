import { CreateWithdrawalDto, UpdateWithdrawalStatusDto } from './dto/withdrawal.dto';
export declare class WithdrawalsService {
    createWithdrawal(data: CreateWithdrawalDto): Promise<any>;
    updateWithdrawalStatus(id: string, data: UpdateWithdrawalStatusDto): Promise<any>;
    private updateMerchantBalance;
    getMerchantWithdrawals(merchantId: string): Promise<any[]>;
}

import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto, UpdateWithdrawalStatusDto } from './dto/withdrawal.dto';
export declare class WithdrawalsController {
    private readonly withdrawalsService;
    constructor(withdrawalsService: WithdrawalsService);
    createWithdrawal(data: CreateWithdrawalDto): Promise<any>;
    updateStatus(id: string, data: UpdateWithdrawalStatusDto): Promise<any>;
    getMerchantWithdrawals(merchantId: string): Promise<any[]>;
}

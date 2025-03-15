import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateMerchantFeeDto, UpdateMerchantStatusDto, DateRangeDto } from './dto/admin.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('merchants')
  async getAllMerchants() {
    return this.adminService.getAllMerchants();
  }

  @Get('merchants/:id')
  async getMerchantDetails(@Param('id') id: string) {
    return this.adminService.getMerchantDetails(id);
  }

  @Put('merchants/:id/fee')
  async updateMerchantFee(
    @Param('id') id: string,
    @Body() data: UpdateMerchantFeeDto,
  ) {
    return this.adminService.updateMerchantFee(id, data);
  }

  @Put('merchants/:id/status')
  async updateMerchantStatus(
    @Param('id') id: string,
    @Body() data: UpdateMerchantStatusDto,
  ) {
    return this.adminService.updateMerchantStatus(id, data);
  }

  @Get('chargebacks')
  async getChargebacks(@Query() dateRange: DateRangeDto) {
    return this.adminService.getChargebacks(dateRange);
  }
}
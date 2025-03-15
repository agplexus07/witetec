import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  Put, 
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { 
  CreateMerchantDto, 
  UpdateMerchantFeeDto, 
  UpdateMerchantStatusDto,
  UploadDocumentDto
} from './dto/merchant.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('merchants')
@Controller('merchants')
@UseGuards(ThrottlerGuard)
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post('register')
  async register(@Body() merchantData: CreateMerchantDto) {
    return this.merchantsService.register(merchantData);
  }

  @Get(':id')
  async getMerchant(@Param('id') id: string) {
    return this.merchantsService.getMerchantById(id);
  }

  @Get(':id/dashboard')
  async getDashboard(@Param('id') id: string) {
    return this.merchantsService.getDashboardStats(id);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateMerchantStatusDto,
  ) {
    return this.merchantsService.updateMerchantStatus(id, data.status, data.rejectionReason);
  }

  @Put(':id/fee')
  async updateFee(
    @Param('id') id: string,
    @Body() data: UpdateMerchantFeeDto,
  ) {
    return this.merchantsService.updateMerchantFee(id, data.feePercentage);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload de documento',
    type: UploadDocumentDto,
  })
  async uploadDocument(
    @Param('id') id: string,
    @Body() data: UploadDocumentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(pdf|jpg|jpeg|png)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.merchantsService.uploadDocument(id, data.type, file);
  }
}
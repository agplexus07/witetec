"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const merchants_service_1 = require("./merchants.service");
const merchant_dto_1 = require("./dto/merchant.dto");
const throttler_1 = require("@nestjs/throttler");
let MerchantsController = class MerchantsController {
    merchantsService;
    constructor(merchantsService) {
        this.merchantsService = merchantsService;
    }
    async register(merchantData) {
        return this.merchantsService.register(merchantData);
    }
    async getMerchant(id) {
        return this.merchantsService.getMerchantById(id);
    }
    async getDashboard(id) {
        return this.merchantsService.getDashboardStats(id);
    }
    async updateStatus(id, data) {
        return this.merchantsService.updateMerchantStatus(id, data.status, data.rejectionReason);
    }
    async updateFee(id, data) {
        return this.merchantsService.updateMerchantFee(id, data.feePercentage);
    }
    async uploadDocument(id, data, file) {
        return this.merchantsService.uploadDocument(id, data.type, file);
    }
};
exports.MerchantsController = MerchantsController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [merchant_dto_1.CreateMerchantDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "register", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "getMerchant", null);
__decorate([
    (0, common_1.Get)(':id/dashboard'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, merchant_dto_1.UpdateMerchantStatusDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Put)(':id/fee'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, merchant_dto_1.UpdateMerchantFeeDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "updateFee", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        description: 'Upload de documento',
        type: merchant_dto_1.UploadDocumentDto,
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
            new common_1.FileTypeValidator({ fileType: '.(pdf|jpg|jpeg|png)' }),
        ],
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, merchant_dto_1.UploadDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "uploadDocument", null);
exports.MerchantsController = MerchantsController = __decorate([
    (0, swagger_1.ApiTags)('merchants'),
    (0, common_1.Controller)('merchants'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    __metadata("design:paramtypes", [merchants_service_1.MerchantsService])
], MerchantsController);
//# sourceMappingURL=merchants.controller.js.map
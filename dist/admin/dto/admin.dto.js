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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateRangeDto = exports.UpdateMerchantStatusDto = exports.UpdateMerchantFeeDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateMerchantFeeDto {
    fee_percentage;
}
exports.UpdateMerchantFeeDto = UpdateMerchantFeeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Percentual da taxa',
        example: 2.99,
        minimum: 0,
        maximum: 100,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateMerchantFeeDto.prototype, "fee_percentage", void 0);
class UpdateMerchantStatusDto {
    status;
    rejection_reason;
}
exports.UpdateMerchantStatusDto = UpdateMerchantStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Status do comerciante',
        example: 'approved',
        enum: ['approved', 'rejected'],
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMerchantStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Motivo da rejeição',
        example: 'Documentação incompleta',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateMerchantStatusDto.prototype, "rejection_reason", void 0);
class DateRangeDto {
    start_date;
    end_date;
}
exports.DateRangeDto = DateRangeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Data inicial',
        example: '2025-01-01',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DateRangeDto.prototype, "start_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Data final',
        example: '2025-12-31',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DateRangeDto.prototype, "end_date", void 0);
//# sourceMappingURL=admin.dto.js.map
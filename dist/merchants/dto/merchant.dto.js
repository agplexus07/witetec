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
exports.UploadDocumentDto = exports.UpdateMerchantStatusDto = exports.UpdateMerchantFeeDto = exports.CreateMerchantDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateMerchantDto {
    company_name;
    trading_name;
    cnpj;
    email;
    phone;
    address;
    city;
    state;
    postal_code;
}
exports.CreateMerchantDto = CreateMerchantDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Razão social da empresa',
        example: 'Empresa Exemplo LTDA',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMerchantDto.prototype, "company_name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nome fantasia da empresa',
        example: 'Empresa Exemplo',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateMerchantDto.prototype, "trading_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'CNPJ da empresa',
        example: '12.345.678/0001-90',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMerchantDto.prototype, "cnpj", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Email comercial',
        example: 'contato@empresa.com',
    }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateMerchantDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Telefone comercial',
        example: '(11) 99999-9999',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateMerchantDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Endereço completo',
        example: 'Rua Exemplo, 123',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateMerchantDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Cidade',
        example: 'São Paulo',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateMerchantDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Estado',
        example: 'SP',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateMerchantDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'CEP',
        example: '12345-678',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateMerchantDto.prototype, "postal_code", void 0);
class UpdateMerchantFeeDto {
    feePercentage;
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
], UpdateMerchantFeeDto.prototype, "feePercentage", void 0);
class UpdateMerchantStatusDto {
    status;
    rejectionReason;
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
], UpdateMerchantStatusDto.prototype, "rejectionReason", void 0);
class UploadDocumentDto {
    type;
    file;
}
exports.UploadDocumentDto = UploadDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Tipo do documento',
        enum: ['cnpj', 'id', 'proof_of_address', 'bank_statement'],
    }),
    (0, class_validator_1.IsEnum)(['cnpj', 'id', 'proof_of_address', 'bank_statement']),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Arquivo do documento',
        type: 'string',
        format: 'binary',
    }),
    __metadata("design:type", Object)
], UploadDocumentDto.prototype, "file", void 0);
//# sourceMappingURL=merchant.dto.js.map
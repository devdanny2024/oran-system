import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() payload: CreateProductDto) {
    return this.productsService.create(payload);
  }

  @Get()
  list() {
    return this.productsService.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.productsService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      unitPrice?: number;
      marketPrice?: number | null;
      ourPrice?: number | null;
      installTechnicianFee?: number | null;
      installClientFee?: number | null;
      integrationTechnicianFee?: number | null;
      integrationClientFee?: number | null;
      active?: boolean;
      description?: string | null;
    },
  ) {
    return this.productsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

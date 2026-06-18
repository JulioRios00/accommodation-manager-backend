import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportXlsxUseCase } from '../../application/use-cases/import-xlsx.use-case';

@Controller('import')
export class ImportController {
  constructor(private readonly importXlsxUseCase: ImportXlsxUseCase) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async importFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const result = await this.importXlsxUseCase.execute(file.buffer);
    return { message: `Successfully imported ${result.imported} beds`, ...result };
  }
}

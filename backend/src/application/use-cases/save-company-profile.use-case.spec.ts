import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { SaveCompanyProfileDto, SaveCompanyProfileUseCase } from './save-company-profile.use-case';
import { MAX_LOGO_DATA_URL_LENGTH } from '../../domain/company-profile/company-profile.entity';

const meta: ArgumentMetadata = { type: 'body', metatype: SaveCompanyProfileDto };
const pipe = new ValidationPipe({ whitelist: true, transform: true });

// 1x1 transparent PNG.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

const build = () => {
  const repo = {
    get: jest.fn(),
    save: jest.fn().mockImplementation((p: any) => Promise.resolve(p)),
  };
  return { repo, useCase: new SaveCompanyProfileUseCase(repo as any) };
};

describe('SaveCompanyProfileDto validation', () => {
  const reject = async (body: Record<string, unknown>) => {
    try {
      await pipe.transform(body, meta);
      return null;
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      return JSON.stringify((e as BadRequestException).getResponse());
    }
  };

  it('accepts a name with a logo', async () => {
    const out: any = await pipe.transform({ appName: 'Dagda', logoDataUrl: PNG }, meta);
    expect(out).toEqual({ appName: 'Dagda', logoDataUrl: PNG });
  });

  it('accepts an explicit null logo, which clears it', async () => {
    const out: any = await pipe.transform({ appName: 'Dagda', logoDataUrl: null }, meta);
    expect(out.logoDataUrl).toBeNull();
  });

  it('rejects an empty or missing name', async () => {
    expect(await reject({ appName: '' })).toContain('appName');
    expect(await reject({})).toContain('appName');
  });

  it('rejects a name longer than the column', async () => {
    expect(await reject({ appName: 'x'.repeat(61) })).toContain('appName');
  });

  it('rejects an oversized logo', async () => {
    const huge = `data:image/png;base64,${'A'.repeat(MAX_LOGO_DATA_URL_LENGTH)}`;
    expect(await reject({ appName: 'Dagda', logoDataUrl: huge })).toContain('too large');
  });

  it('strips unknown fields', async () => {
    const out: any = await pipe.transform({ appName: 'Dagda', id: 'other', updatedAt: 'x' }, meta);
    expect(out).not.toHaveProperty('id');
    expect(out).not.toHaveProperty('updatedAt');
  });
});

describe('SaveCompanyProfileUseCase', () => {
  it('trims the name before saving', async () => {
    const { repo, useCase } = build();
    await useCase.execute({ appName: '  Dagda  ' } as SaveCompanyProfileDto);
    expect(repo.save).toHaveBeenCalledWith({ appName: 'Dagda', logoDataUrl: null });
  });

  it('rejects a whitespace-only name', async () => {
    const { useCase } = build();
    await expect(useCase.execute({ appName: '   ' } as SaveCompanyProfileDto)).rejects.toThrow(/must not be empty/);
  });

  it('treats an omitted logo as cleared', async () => {
    const { repo, useCase } = build();
    await useCase.execute({ appName: 'Dagda' } as SaveCompanyProfileDto);
    expect(repo.save.mock.calls[0][0].logoDataUrl).toBeNull();
  });

  // The shell renders this value straight into an <img src>, so anything that isn't a
  // base64 image data URL has to be refused here.
  it.each([
    ['a remote URL', 'https://example.com/logo.png'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['an HTML data URL', 'data:text/html;base64,PHNjcmlwdD4='],
    ['an SVG that is not base64', 'data:image/svg+xml,<svg onload="alert(1)"/>'],
    ['junk', 'not-a-url'],
  ])('rejects %s as a logo', async (_label, value) => {
    const { useCase } = build();
    await expect(
      useCase.execute({ appName: 'Dagda', logoDataUrl: value } as SaveCompanyProfileDto),
    ).rejects.toThrow(/base64 PNG, JPEG, SVG or WebP/);
  });

  it.each([
    ['PNG', PNG],
    ['JPEG', 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='],
    ['SVG', 'data:image/svg+xml;base64,PHN2Zy8+'],
    ['WebP', 'data:image/webp;base64,UklGRg=='],
  ])('accepts a base64 %s logo', async (_label, value) => {
    const { repo, useCase } = build();
    await useCase.execute({ appName: 'Dagda', logoDataUrl: value } as SaveCompanyProfileDto);
    expect(repo.save.mock.calls[0][0].logoDataUrl).toBe(value);
  });
});

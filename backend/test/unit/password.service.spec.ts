import { PasswordService } from 'src/modules/auth/password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a correct password', async () => {
    const hash = await service.hash('Password123!');
    expect(hash).not.toEqual('Password123!');
    await expect(service.verify('Password123!', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('Password123!');
    await expect(service.verify('wrong', hash)).resolves.toBe(false);
  });

  it('produces distinct hashes for the same input (salted)', async () => {
    const a = await service.hash('same');
    const b = await service.hash('same');
    expect(a).not.toEqual(b);
  });
});

import { Injectable } from '@nestjs/common';
import { Prisma, RoleName, User, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

export type UserWithRoles = User & { roles: { role: { name: RoleName } }[] };

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(companyId: string, email: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { companyId_email: { companyId, email: email.toLowerCase() } },
      include: { roles: { include: { role: true } } },
    });
  }

  findById(companyId: string, id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: { id, companyId },
      include: { roles: { include: { role: true } } },
    });
  }

  findByInviteTokenHash(hash: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { inviteTokenHash: hash } });
  }

  findByResetTokenHash(hash: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { resetTokenHash: hash } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async assignRole(userId: string, roleName: RoleName): Promise<void> {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  setStatus(id: string, status: UserStatus): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { status } });
  }
}

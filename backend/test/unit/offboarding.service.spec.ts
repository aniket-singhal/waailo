import { OffboardingService } from 'src/modules/offboarding/offboarding.service';
import { AuthUser } from 'src/common/tenant/auth-user';

const user: AuthUser = {
  userId: 'u1',
  companyId: 'c1',
  email: 'hr@demo.co',
  roles: ['HR_ADMIN'],
} as AuthUser;

function makeRepo() {
  return {
    createExit: jest.fn(),
    listExits: jest.fn(),
    findExit: jest.fn(),
    updateExit: jest.fn(),
    createTasks: jest.fn(),
    listTasks: jest.fn(),
    findTask: jest.fn(),
    updateTask: jest.fn(),
  };
}
function makeEmployees() {
  return { findById: jest.fn(), update: jest.fn() };
}

const activeEmployee = {
  id: 'e1',
  companyId: 'c1',
  firstName: 'Arjun',
  lastName: 'Sharma',
  employeeCode: 'EMP-0001',
  status: 'ACTIVE',
};

describe('OffboardingService', () => {
  let repo: ReturnType<typeof makeRepo>;
  let employees: ReturnType<typeof makeEmployees>;
  let svc: OffboardingService;

  beforeEach(() => {
    repo = makeRepo();
    employees = makeEmployees();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    svc = new OffboardingService(repo as any, employees as any);
  });

  describe('initiate', () => {
    it('creates an exit, default clearance tasks, and puts the employee on notice', async () => {
      employees.findById.mockResolvedValue({ ...activeEmployee });
      repo.createExit.mockResolvedValue({ id: 'x1', employeeId: 'e1', lastWorkingDay: new Date('2026-07-31') });

      await svc.initiate(user, {
        employeeId: 'e1',
        type: 'RESIGNATION',
        noticeDate: '2026-06-30',
        lastWorkingDay: '2026-07-31',
      });

      expect(repo.createExit).toHaveBeenCalledTimes(1);
      // default checklist created
      const taskArg = repo.createTasks.mock.calls[0][0];
      expect(Array.isArray(taskArg)).toBe(true);
      expect(taskArg.length).toBeGreaterThanOrEqual(5);
      expect(taskArg[0]).toMatchObject({ companyId: 'c1', exitRecordId: 'x1' });
      // employee moved to ON_NOTICE
      expect(employees.update).toHaveBeenCalledWith('e1', { status: 'ON_NOTICE' });
    });

    it('throws if the employee does not exist', async () => {
      employees.findById.mockResolvedValue(null);
      await expect(
        svc.initiate(user, { employeeId: 'nope', type: 'RESIGNATION', noticeDate: '2026-06-30', lastWorkingDay: '2026-07-31' }),
      ).rejects.toThrow('Employee not found');
    });

    it('throws if the employee already exited', async () => {
      employees.findById.mockResolvedValue({ ...activeEmployee, status: 'EXITED' });
      await expect(
        svc.initiate(user, { employeeId: 'e1', type: 'RESIGNATION', noticeDate: '2026-06-30', lastWorkingDay: '2026-07-31' }),
      ).rejects.toThrow('already exited');
    });
  });

  describe('updateStatus', () => {
    it('marks the employee EXITED with the last working day on completion', async () => {
      const lwd = new Date('2026-07-31');
      repo.findExit.mockResolvedValue({ id: 'x1', employeeId: 'e1', lastWorkingDay: lwd });
      repo.updateExit.mockResolvedValue({ id: 'x1', employeeId: 'e1', lastWorkingDay: lwd, status: 'COMPLETED' });
      employees.findById.mockResolvedValue({ ...activeEmployee });

      await svc.updateStatus(user, 'x1', { status: 'COMPLETED' });

      expect(employees.update).toHaveBeenCalledWith('e1', { status: 'EXITED', dateOfExit: lwd });
    });

    it('reinstates the employee to ACTIVE when cancelled', async () => {
      repo.findExit.mockResolvedValue({ id: 'x1', employeeId: 'e1', lastWorkingDay: new Date() });
      repo.updateExit.mockResolvedValue({ id: 'x1', employeeId: 'e1', status: 'CANCELLED' });
      employees.findById.mockResolvedValue({ ...activeEmployee });

      await svc.updateStatus(user, 'x1', { status: 'CANCELLED' });

      expect(employees.update).toHaveBeenCalledWith('e1', { status: 'ACTIVE' });
    });

    it('throws if the exit record is missing', async () => {
      repo.findExit.mockResolvedValue(null);
      await expect(svc.updateStatus(user, 'x1', { status: 'COMPLETED' })).rejects.toThrow('not found');
    });
  });

  describe('toggleTask', () => {
    it('updates the task done flag', async () => {
      repo.findTask.mockResolvedValue({ id: 't1' });
      repo.updateTask.mockResolvedValue({ id: 't1', done: true });
      await svc.toggleTask(user, 't1', { done: true });
      expect(repo.updateTask).toHaveBeenCalledWith('t1', true);
    });

    it('throws if the task is missing', async () => {
      repo.findTask.mockResolvedValue(null);
      await expect(svc.toggleTask(user, 't1', { done: true })).rejects.toThrow('not found');
    });
  });
});

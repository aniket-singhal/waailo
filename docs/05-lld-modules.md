# 05 — Low-Level Module Designs

This document is the low-level design (LLD). For each of the nine modules it gives:

- a **class diagram** of the controller / service / repository / DTO structure (the clean
  architecture layering from [document 02](./02-high-level-architecture.md) §2.5), and
- one or more **sequence diagrams** for the module's key runtime flows.

All modules share the same skeleton: a thin `*Controller`, a `*Service` holding the domain
logic, a `*Repository` wrapping Prisma and scoping by `companyId`, DTOs validated with
`class-validator`, and (where relevant) BullMQ producers/consumers for async work. To avoid
repetition, the shared building blocks are shown once below; per-module diagrams then focus
on what is specific to that module.

## 5.0 Shared building blocks

```mermaid
classDiagram
    class TenantContext {
        +string companyId
        +string userId
        +RoleName[] roles
    }
    class BaseRepository~T~ {
        #PrismaService prisma
        +scoped(companyId) PrismaDelegate
        +findManyScoped(companyId, args) T[]
    }
    class AuthGuard {
        +canActivate(ctx) boolean
    }
    class RolesGuard {
        +canActivate(ctx) boolean
    }
    class GlobalExceptionFilter {
        +catch(error) ErrorEnvelope
    }
    class EventBus {
        +publish(event) void
    }
    class QueueProducer {
        +enqueue(jobName, payload, opts) void
    }
    BaseRepository ..> TenantContext : scopes by companyId
    RolesGuard ..> TenantContext
```

> Every controller is decorated with `@UseGuards(AuthGuard, RolesGuard)` and `@Roles(...)`.
> Every repository extends `BaseRepository` and never issues a query without `companyId`.
> Every service that causes a side effect calls `EventBus.publish` or `QueueProducer.enqueue`
> rather than performing the side effect inline.

---

## 5.1 Auth module

Owns identity, login, token issuance/rotation, RBAC and the password lifecycle.

### Class diagram

```mermaid
classDiagram
    class AuthController {
        +login(LoginDto) TokenPairDto
        +refresh(RefreshDto) TokenPairDto
        +logout(RefreshDto) void
        +forgotPassword(EmailDto) void
        +resetPassword(ResetDto) void
        +acceptInvite(AcceptInviteDto) TokenPairDto
    }
    class AuthService {
        +validateCredentials(email, pwd, companySlug) User
        +issueTokenPair(user) TokenPairDto
        +rotateRefreshToken(token) TokenPairDto
        +revoke(token) void
        +startPasswordReset(email) void
        +completePasswordReset(token, pwd) void
    }
    class TokenService {
        +signAccess(payload) string
        +signRefresh(user) string
        +verifyAccess(token) JwtPayload
        +hashRefresh(token) string
    }
    class PasswordService {
        +hash(plain) string
        +verify(plain, hash) boolean
    }
    class UserRepository {
        +findByEmail(companyId, email) User
        +create(data) User
        +setPassword(userId, hash) void
    }
    class RefreshTokenRepository {
        +store(userId, hashed, expiresAt) RefreshToken
        +findValid(hashed) RefreshToken
        +revoke(id, replacedById) void
    }

    AuthController --> AuthService
    AuthService --> TokenService
    AuthService --> PasswordService
    AuthService --> UserRepository
    AuthService --> RefreshTokenRepository
```

### Sequence — login with refresh-token rotation

```mermaid
sequenceDiagram
    actor U as User (browser)
    participant C as AuthController
    participant S as AuthService
    participant P as PasswordService
    participant T as TokenService
    participant UR as UserRepository
    participant RR as RefreshTokenRepository

    U->>C: POST /auth/login {email, password}
    C->>S: validateCredentials(...)
    S->>UR: findByEmail(companyId, email)
    UR-->>S: user
    S->>P: verify(password, user.hash)
    P-->>S: true
    S->>T: signAccess(payload) + signRefresh(user)
    T-->>S: accessToken, refreshToken
    S->>RR: store(userId, hash(refreshToken), expiresAt)
    S-->>C: TokenPairDto
    C-->>U: 200 {accessToken, refreshToken}

    Note over U,RR: Later, access token expires
    U->>C: POST /auth/refresh {refreshToken}
    C->>S: rotateRefreshToken(token)
    S->>RR: findValid(hash(token))
    RR-->>S: token (not revoked, not expired)
    S->>RR: revoke(old, replacedBy=new)
    S->>T: sign new pair
    S-->>C: TokenPairDto
    C-->>U: 200 {new tokens}
```

---

## 5.2 Company module

Owns the tenant, departments, designations, locations and company settings.

### Class diagram

```mermaid
classDiagram
    class CompanyController {
        +getCompany() CompanyDto
        +updateSettings(UpdateSettingsDto) CompanyDto
        +createDepartment(DepartmentDto) DepartmentDto
        +listDepartments() DepartmentDto[]
        +createDesignation(DesignationDto) DesignationDto
        +createLocation(LocationDto) LocationDto
    }
    class CompanyService {
        +getById(companyId) Company
        +updateSettings(companyId, dto) Company
        +addDepartment(companyId, name) Department
        +addDesignation(companyId, title) Designation
        +addLocation(companyId, dto) Location
    }
    class CompanyRepository {
        +findById(companyId) Company
        +updateSettings(companyId, settings) Company
    }
    class OrgRepository {
        +createDepartment(companyId, name) Department
        +listDepartments(companyId) Department[]
        +createDesignation(companyId, title) Designation
        +createLocation(companyId, dto) Location
    }
    CompanyController --> CompanyService
    CompanyService --> CompanyRepository
    CompanyService --> OrgRepository
```

### Sequence — company onboarding (sign-up creates tenant + owner)

```mermaid
sequenceDiagram
    actor R as Owner (sign-up)
    participant CC as CompanyController
    participant CS as CompanyService
    participant AS as AuthService
    participant CR as CompanyRepository
    participant UR as UserRepository

    R->>CC: POST /companies/signup {company, owner}
    CC->>CS: createTenant(dto)
    CS->>CR: create company (status=TRIAL)
    CR-->>CS: company
    CS->>AS: createOwnerUser(companyId, owner)
    AS->>UR: create user + assign OWNER role
    UR-->>AS: user
    AS-->>CS: ownerUser
    CS-->>CC: company + owner
    CC-->>R: 201 + token pair (auto-login)
```

---

## 5.3 Employees module

The anchor context: employee records, employment, compensation and lifecycle.

### Class diagram

```mermaid
classDiagram
    class EmployeeController {
        +create(CreateEmployeeDto) EmployeeDto
        +invite(InviteEmployeeDto) void
        +get(id) EmployeeDto
        +list(EmployeeQueryDto) Paginated~EmployeeDto~
        +update(id, UpdateEmployeeDto) EmployeeDto
        +setSalary(id, SalaryStructureDto) EmployeeDto
        +changeStatus(id, ChangeStatusDto) EmployeeDto
    }
    class EmployeeService {
        +create(companyId, dto) Employee
        +invite(companyId, dto) Employee
        +list(companyId, query) Paginated
        +update(companyId, id, dto) Employee
        +setActiveSalary(companyId, id, dto) SalaryStructure
        +transition(companyId, id, target) Employee
        -assertManagerValid(companyId, managerId)
    }
    class EmployeeRepository {
        +create(data) Employee
        +findById(companyId, id) Employee
        +search(companyId, query) Paginated
        +update(companyId, id, data) Employee
    }
    class SalaryRepository {
        +deactivateCurrent(employeeId) void
        +create(data) SalaryStructure
    }
    class EmployeeLifecycle {
        +canTransition(from, to) boolean
        +next(from, event) EmployeeStatus
    }
    EmployeeController --> EmployeeService
    EmployeeService --> EmployeeRepository
    EmployeeService --> SalaryRepository
    EmployeeService --> EmployeeLifecycle
    EmployeeService ..> EventBus : EmployeeInvited / Activated
```

### Sequence — invite and onboard an employee

```mermaid
sequenceDiagram
    actor A as HR Admin
    participant EC as EmployeeController
    participant ES as EmployeeService
    participant ER as EmployeeRepository
    participant AS as AuthService
    participant EB as EventBus
    participant Q as Notifications (worker)
    actor E as New Employee

    A->>EC: POST /employees/invite {name,email,...}
    EC->>ES: invite(companyId, dto)
    ES->>ER: create employee (status=INVITED)
    ES->>AS: create user (status=INVITED) + invite token
    ES->>EB: publish EmployeeInvited{employeeId, email, token}
    EB-->>Q: job: send invite (WhatsApp/email)
    Q-->>E: invite link
    ES-->>EC: EmployeeDto
    EC-->>A: 201

    E->>EC: POST /auth/accept-invite {token, password, profile}
    EC->>ES: completeOnboarding(...)
    ES->>ER: update employee (status=ACTIVE)
    ES->>EB: publish EmployeeActivated{employeeId}
    EC-->>E: 200 + token pair
```

---

## 5.4 Attendance module

Daily attendance plus regularisation; produces the monthly summary payroll consumes.

### Class diagram

```mermaid
classDiagram
    class AttendanceController {
        +checkIn(CheckInDto) AttendanceDto
        +checkOut(CheckOutDto) AttendanceDto
        +listForEmployee(employeeId, RangeDto) AttendanceDto[]
        +requestRegularisation(RegularisationDto) RegularisationDto
        +decideRegularisation(id, DecisionDto) RegularisationDto
        +monthlySummary(employeeId, month, year) SummaryDto
    }
    class AttendanceService {
        +checkIn(ctx, dto) AttendanceRecord
        +checkOut(ctx, dto) AttendanceRecord
        +requestRegularisation(ctx, dto) RegularisationRequest
        +decide(ctx, id, decision) RegularisationRequest
        +buildMonthlySummary(ctx, employeeId, month, year) Summary
    }
    class AttendanceRepository {
        +findByDate(employeeId, date) AttendanceRecord
        +upsert(data) AttendanceRecord
        +rangeForEmployee(companyId, employeeId, from, to) AttendanceRecord[]
    }
    class RegularisationRepository {
        +create(data) RegularisationRequest
        +findById(companyId, id) RegularisationRequest
        +update(id, data) RegularisationRequest
    }
    class WorkTimeCalculator {
        +workedMinutes(checkIn, checkOut) number
        +deriveStatus(record, policy) AttendanceStatus
    }
    AttendanceController --> AttendanceService
    AttendanceService --> AttendanceRepository
    AttendanceService --> RegularisationRepository
    AttendanceService --> WorkTimeCalculator
    AttendanceService ..> EventBus : RegularisationDecided
```

### Sequence — check-in / check-out

```mermaid
sequenceDiagram
    actor E as Employee
    participant AC as AttendanceController
    participant AS as AttendanceService
    participant AR as AttendanceRepository
    participant W as WorkTimeCalculator

    E->>AC: POST /attendance/check-in
    AC->>AS: checkIn(ctx, dto)
    AS->>AR: findByDate(employeeId, today)
    AR-->>AS: none
    AS->>AR: upsert {checkInAt=now, status=PRESENT}
    AR-->>AS: record
    AS-->>AC: AttendanceDto
    AC-->>E: 200

    E->>AC: POST /attendance/check-out
    AC->>AS: checkOut(ctx, dto)
    AS->>AR: findByDate(employeeId, today)
    AR-->>AS: record(with checkInAt)
    AS->>W: workedMinutes(checkIn, now)
    W-->>AS: minutes
    AS->>AR: upsert {checkOutAt=now, workedMinutes}
    AS-->>AC: AttendanceDto
    AC-->>E: 200
```

### Sequence — regularisation approval

```mermaid
sequenceDiagram
    actor E as Employee
    actor M as Manager
    participant AC as AttendanceController
    participant AS as AttendanceService
    participant RR as RegularisationRepository
    participant AR as AttendanceRepository
    participant EB as EventBus

    E->>AC: POST /attendance/regularisation {date, requestedStatus, reason}
    AC->>AS: requestRegularisation(ctx, dto)
    AS->>RR: create(status=PENDING)
    AS->>EB: publish RegularisationRequested (notify manager)
    AC-->>E: 201

    M->>AC: PATCH /attendance/regularisation/:id {approve}
    AC->>AS: decide(ctx, id, APPROVE)
    AS->>RR: update(status=APPROVED)
    AS->>AR: upsert corrected record
    AS->>EB: publish RegularisationDecided (notify employee)
    AC-->>M: 200
```

---

## 5.5 Leaves module

Leave types/policies, balances, and the apply → approve workflow with balance reservation.

### Class diagram

```mermaid
classDiagram
    class LeaveController {
        +createType(LeaveTypeDto) LeaveTypeDto
        +createPolicy(LeavePolicyDto) LeavePolicyDto
        +apply(ApplyLeaveDto) LeaveRequestDto
        +decide(id, DecisionDto) LeaveRequestDto
        +cancel(id) LeaveRequestDto
        +balances(employeeId, year) LeaveBalanceDto[]
        +calendar(RangeDto) LeaveCalendarDto
    }
    class LeaveService {
        +apply(ctx, dto) LeaveRequest
        +decide(ctx, id, decision) LeaveRequest
        +cancel(ctx, id) LeaveRequest
        +getBalances(ctx, employeeId, year) LeaveBalance[]
        -reserve(balance, days)
        -consume(balance, days)
        -release(balance, days)
    }
    class LeaveCalculator {
        +workingDays(range, calendar, weeklyOff) number
        +validateAgainstPolicy(req, policy) void
    }
    class LeaveRequestRepository {
        +create(data) LeaveRequest
        +findOverlapping(employeeId, range) LeaveRequest[]
        +update(id, data) LeaveRequest
    }
    class LeaveBalanceRepository {
        +find(employeeId, typeId, year) LeaveBalance
        +update(id, data) LeaveBalance
    }
    class HolidayQueryPort {
        +getCalendar(companyId, locationId, year) Holiday[]
    }
    LeaveController --> LeaveService
    LeaveService --> LeaveCalculator
    LeaveService --> LeaveRequestRepository
    LeaveService --> LeaveBalanceRepository
    LeaveService --> HolidayQueryPort
    LeaveService ..> EventBus : LeaveRequested / LeaveDecided
```

### Sequence — apply for leave (balance reserved, validated)

```mermaid
sequenceDiagram
    actor E as Employee
    participant LC as LeaveController
    participant LS as LeaveService
    participant CAL as LeaveCalculator
    participant HP as HolidayQueryPort
    participant RR as LeaveRequestRepository
    participant BR as LeaveBalanceRepository
    participant EB as EventBus

    E->>LC: POST /leaves/apply {typeId, start, end}
    LC->>LS: apply(ctx, dto)
    LS->>HP: getCalendar(companyId, locationId, year)
    HP-->>LS: holidays
    LS->>CAL: workingDays(range, holidays, weeklyOff)
    CAL-->>LS: days
    LS->>RR: findOverlapping(employeeId, range)
    RR-->>LS: [] (no overlap)
    LS->>BR: find(employeeId, typeId, year)
    BR-->>LS: balance
    LS->>CAL: validateAgainstPolicy(req, policy)
    LS->>BR: update(pending += days)  %% reserve
    LS->>RR: create(status=PENDING, days)
    LS->>EB: publish LeaveRequested (notify approver)
    LS-->>LC: LeaveRequestDto
    LC-->>E: 201
```

### Sequence — approve / reject leave

```mermaid
sequenceDiagram
    actor M as Manager
    participant LC as LeaveController
    participant LS as LeaveService
    participant RR as LeaveRequestRepository
    participant BR as LeaveBalanceRepository
    participant EB as EventBus

    M->>LC: PATCH /leaves/:id {decision}
    LC->>LS: decide(ctx, id, decision)
    LS->>RR: findById -> PENDING request
    alt Approved
        LS->>BR: update(pending -= days, used += days)
        LS->>RR: update(status=APPROVED)
    else Rejected
        LS->>BR: update(pending -= days)  %% release reservation
        LS->>RR: update(status=REJECTED)
    end
    LS->>EB: publish LeaveDecided (notify employee)
    LC-->>M: 200
```

---

## 5.6 Holidays module

Calendars per company/location/year; a query port consumed by Leaves and Payroll.

### Class diagram

```mermaid
classDiagram
    class HolidayController {
        +createCalendar(CalendarDto) CalendarDto
        +addHoliday(calendarId, HolidayDto) HolidayDto
        +importCalendar(ImportDto) CalendarDto
        +list(year, locationId) CalendarDto
    }
    class HolidayService {
        +createCalendar(ctx, dto) HolidayCalendar
        +addHoliday(ctx, calendarId, dto) Holiday
        +getEffectiveCalendar(ctx, locationId, year) Holiday[]
    }
    class HolidayRepository {
        +createCalendar(data) HolidayCalendar
        +addHoliday(data) Holiday
        +findCalendar(companyId, locationId, year) HolidayCalendar
    }
    HolidayController --> HolidayService
    HolidayService --> HolidayRepository
    HolidayService ..|> HolidayQueryPort : implements
```

### Sequence — resolve effective calendar (location falls back to company default)

```mermaid
sequenceDiagram
    participant Caller as Leaves / Payroll
    participant HS as HolidayService
    participant HR as HolidayRepository

    Caller->>HS: getEffectiveCalendar(locationId, year)
    HS->>HR: findCalendar(companyId, locationId, year)
    alt Location-specific exists
        HR-->>HS: location calendar
    else Fall back
        HS->>HR: findCalendar(companyId, null, year)
        HR-->>HS: company-wide calendar
    end
    HS-->>Caller: holidays[]
```

---

## 5.7 Payroll module

Runs payroll for a period, computes earnings/deductions and statutory components, and
produces payslip PDFs asynchronously.

### Class diagram

```mermaid
classDiagram
    class PayrollController {
        +createRun(CreateRunDto) PayrollRunDto
        +processRun(id) PayrollRunDto
        +getRun(id) PayrollRunDto
        +listPayslips(runId) PayslipDto[]
        +getPayslip(id) PayslipDto
        +downloadPayslip(id) SignedUrl
        +markPaid(id) PayrollRunDto
    }
    class PayrollService {
        +createRun(ctx, period) PayrollRun
        +process(ctx, runId) void
        +markPaid(ctx, runId) PayrollRun
    }
    class PayrollCalculator {
        +computePayslip(employee, salary, attendance, leave, rates) PayslipDraft
        -computeEarnings(...)
        -computeStatutory(...)
    }
    class PayrollRunRepository {
        +create(data) PayrollRun
        +update(id, data) PayrollRun
    }
    class PayslipRepository {
        +createWithLines(data) Payslip
        +listByRun(companyId, runId) Payslip[]
    }
    class StatutoryRatePort {
        +getRates(country, period) StatutoryRate[]
    }
    class AttendanceSummaryPort {
        +monthlySummary(employeeId, month, year) Summary
    }
    class PayslipPdfJob {
        +handle(payslipId) void
    }
    PayrollController --> PayrollService
    PayrollService --> PayrollCalculator
    PayrollService --> PayrollRunRepository
    PayrollService --> PayslipRepository
    PayrollService --> StatutoryRatePort
    PayrollService --> AttendanceSummaryPort
    PayrollService ..> QueueProducer : enqueue PDF + notify
    PayslipPdfJob ..> PayslipRepository
```

### Sequence — run payroll for a period (async, idempotent)

```mermaid
sequenceDiagram
    actor A as HR Admin
    participant PC as PayrollController
    participant PS as PayrollService
    participant RR as PayrollRunRepository
    participant EP as EmployeesPort
    participant AP as AttendanceSummaryPort
    participant SR as StatutoryRatePort
    participant CAL as PayrollCalculator
    participant PR as PayslipRepository
    participant Q as QueueProducer
    participant W as Worker (PDF + notify)

    A->>PC: POST /payroll/runs {month, year}
    PC->>PS: createRun(ctx, period)
    PS->>RR: create(status=DRAFT)  %% unique per (company, period)
    PC-->>A: 201 run(DRAFT)

    A->>PC: POST /payroll/runs/:id/process
    PC->>PS: process(ctx, runId)
    PS->>RR: update(status=PROCESSING)
    PS->>EP: listActiveEmployees(companyId)
    EP-->>PS: employees + active salary
    loop each employee
        PS->>AP: monthlySummary(employeeId, month, year)
        PS->>SR: getRates(country, period)
        PS->>CAL: computePayslip(emp, salary, attendance, leave, rates)
        CAL-->>PS: payslipDraft(lines, gross, net)
        PS->>PR: createWithLines(draft)  %% idempotent on (run, employee)
        PS->>Q: enqueue PayslipPdf{payslipId}
    end
    PS->>RR: update(status=COMPLETED, totals)
    PS->>Q: enqueue Notify PayrollRunCompleted
    PC-->>A: 200 (completed)

    W->>W: render PDF -> object storage, set pdfObjectKey
    W->>W: send "payslip ready" to each employee
```

### Flow — statutory deduction calculation (decision flow)

```mermaid
flowchart TD
    Start([computePayslip]) --> Basic[Derive earnings from salary structure]
    Basic --> Prorate{Full month worked?}
    Prorate -- No --> ProrateCalc[Pro-rate gross by paid days from attendance + leave]
    Prorate -- Yes --> EPF
    ProrateCalc --> EPF[Compute EPF: 12% of capped basic]
    EPF --> ESI{Gross <= ESI wage ceiling?}
    ESI -- Yes --> ESICalc[Apply ESI employee rate]
    ESI -- No --> PT
    ESICalc --> PT[Apply Professional Tax slab by state]
    PT --> TDS[Apply TDS per declared regime / projection]
    TDS --> Net[net = earnings - sum deductions]
    Net --> End([PayslipDraft])
```

---

## 5.8 Notifications module

Renders templates and delivers WhatsApp/email via queues, with retry and idempotency.

### Class diagram

```mermaid
classDiagram
    class NotificationEventHandler {
        +on(EmployeeInvited) void
        +on(LeaveDecided) void
        +on(PayrollRunCompleted) void
        +on(DocumentExpiringSoon) void
    }
    class NotificationService {
        +dispatch(ctx, eventKey, recipient, data) Notification
        -render(template, data) string
    }
    class TemplateRepository {
        +resolve(companyId, eventKey, channel, locale) NotificationTemplate
    }
    class NotificationRepository {
        +create(data) Notification
        +markSent(id, providerId) void
        +markFailed(id, error) void
    }
    class WhatsappProvider {
        +send(to, body) ProviderResult
    }
    class EmailProvider {
        +send(to, subject, body) ProviderResult
    }
    class NotificationJob {
        +handle(notificationId) void
    }
    NotificationEventHandler --> NotificationService
    NotificationService --> TemplateRepository
    NotificationService --> NotificationRepository
    NotificationService ..> QueueProducer : enqueue send
    NotificationJob --> NotificationRepository
    NotificationJob --> WhatsappProvider
    NotificationJob --> EmailProvider
```

### Sequence — event to delivery with retry

```mermaid
sequenceDiagram
    participant EB as EventBus
    participant H as NotificationEventHandler
    participant NS as NotificationService
    participant TR as TemplateRepository
    participant NR as NotificationRepository
    participant Q as Queue
    participant J as NotificationJob
    participant WA as WhatsappProvider

    EB-->>H: LeaveDecided{employee, decision}
    H->>NS: dispatch(eventKey, recipient, data)
    NS->>TR: resolve(companyId, eventKey, WHATSAPP, locale)
    TR-->>NS: template
    NS->>NR: create(status=QUEUED, rendered payload)
    NS->>Q: enqueue send{notificationId}
    Q-->>J: job
    J->>WA: send(to, body)
    alt success
        WA-->>J: providerMessageId
        J->>NR: markSent(id, providerId)
    else failure
        WA-->>J: error
        J->>NR: markFailed(id, error) + retry w/ backoff
    end
```

---

## 5.9 Documents module

Stores files in object storage, enforces access rules, and reminds before expiry.

### Class diagram

```mermaid
classDiagram
    class DocumentController {
        +requestUpload(UploadIntentDto) PresignedUploadDto
        +confirmUpload(ConfirmDto) DocumentDto
        +get(id) DocumentDto
        +download(id) SignedUrl
        +list(DocumentQueryDto) DocumentDto[]
        +delete(id) void
    }
    class DocumentService {
        +createUploadIntent(ctx, dto) PresignedUpload
        +confirmUpload(ctx, dto) Document
        +getDownloadUrl(ctx, id) string
        +list(ctx, query) Document[]
        +softDelete(ctx, id) void
        -assertCanAccess(ctx, doc)
    }
    class DocumentRepository {
        +create(data) Document
        +findById(companyId, id) Document
        +list(companyId, query) Document[]
        +findExpiring(companyId, before) Document[]
    }
    class ObjectStoragePort {
        +presignPut(key, mime) string
        +presignGet(key) string
        +exists(key) boolean
    }
    class ExpiryScanJob {
        +handle() void
    }
    DocumentController --> DocumentService
    DocumentService --> DocumentRepository
    DocumentService --> ObjectStoragePort
    DocumentService ..> EventBus : DocumentExpiringSoon
    ExpiryScanJob --> DocumentRepository
    ExpiryScanJob ..> EventBus
```

### Sequence — presigned upload then expiry reminder

```mermaid
sequenceDiagram
    actor A as HR Admin
    participant DC as DocumentController
    participant DS as DocumentService
    participant OS as ObjectStoragePort
    participant DR as DocumentRepository
    participant SC as ExpiryScanJob (scheduled)
    participant EB as EventBus

    A->>DC: POST /documents/upload-intent {title, mime, expiresAt}
    DC->>DS: createUploadIntent(ctx, dto)
    DS->>OS: presignPut(key, mime)
    OS-->>DS: presigned URL
    DS-->>A: {uploadUrl, objectKey}
    A->>OS: PUT file directly to storage
    A->>DC: POST /documents/confirm {objectKey}
    DC->>DS: confirmUpload(ctx, dto)
    DS->>OS: exists(key)?
    DS->>DR: create(metadata, expiresAt)
    DC-->>A: 201 DocumentDto

    Note over SC,EB: Daily scheduled scan
    SC->>DR: findExpiring(companyId, in 30 days)
    DR-->>SC: documents
    SC->>EB: publish DocumentExpiringSoon (per doc)
```

## 5.10 Cross-module flow — payroll month-end (composite)

To show how contexts collaborate, the end-to-end month-end flow ties Attendance, Leaves,
Holidays, Payroll, Documents and Notifications together.

```mermaid
sequenceDiagram
    actor A as HR Admin
    participant Pay as Payroll
    participant Att as Attendance
    participant Lv as Leaves
    participant Hol as Holidays
    participant Doc as Documents
    participant Ntf as Notifications

    A->>Pay: process run (month)
    Pay->>Att: monthly summaries (paid days)
    Pay->>Lv: approved leave in period
    Pay->>Hol: holidays in period
    Pay->>Pay: compute payslips (+ statutory)
    Pay->>Doc: archive payslip PDFs
    Pay->>Ntf: PayrollRunCompleted (notify employees)
    Ntf-->>A: run summary, employees get payslip-ready message
```

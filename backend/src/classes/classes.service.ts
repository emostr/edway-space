import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildSearchKey, className, titleCase } from '../common/text';
import { CreateClassDto, StudentInput } from './dto/classes.dto';

export interface ClassRow {
  id: string;
  number: number;
  letter: string;
  name: string;
  studentCount: number;
  assignmentCount: number;
  archivedAt: string | null;
  createdAt: string;
}

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived = false): Promise<ClassRow[]> {
    const rows = await this.prisma.schoolClass.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: [{ number: 'asc' }, { letter: 'asc' }],
      include: {
        _count: { select: { students: true, assignments: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      number: row.number,
      letter: row.letter,
      name: className(row.number, row.letter),
      studentCount: row._count.students,
      assignmentCount: row._count.assignments,
      archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async create(dto: CreateClassDto, teacherId: string): Promise<ClassRow> {
    const exists = await this.prisma.schoolClass.findFirst({
      where: { number: dto.number, letter: dto.letter, archiveKey: '' },
    });
    if (exists) {
      throw new BadRequestException(`Класс ${className(dto.number, dto.letter)} уже заведён`);
    }
    const created = await this.prisma.schoolClass.create({
      data: { number: dto.number, letter: dto.letter, createdById: teacherId },
      include: { _count: { select: { students: true, assignments: true } } },
    });
    return {
      id: created.id,
      number: created.number,
      letter: created.letter,
      name: className(created.number, created.letter),
      studentCount: 0,
      assignmentCount: 0,
      archivedAt: null,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async detail(id: string) {
    const row = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: {
        students: {
          where: { archivedAt: null },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Класс не найден');
    }
    return {
      id: row.id,
      number: row.number,
      letter: row.letter,
      name: className(row.number, row.letter),
      archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
      students: row.students.map((s) => ({
        id: s.id,
        lastName: s.lastName,
        firstName: s.firstName,
        fullName: `${s.lastName} ${s.firstName}`,
      })),
    };
  }

  /**
   * Список класса учитель вставляет целиком — одной колонкой из журнала.
   * Уже заведённые ученики сохраняются вместе со своими работами: сверяем
   * по нормализованному ключу «фамилияимя», лишних заводим, пропавших
   * убираем в архив (их работы остаются в журнале оценок).
   */
  async replaceStudents(classId: string, students: StudentInput[]) {
    const target = await this.prisma.schoolClass.findUnique({ where: { id: classId } });
    if (!target) {
      throw new NotFoundException('Класс не найден');
    }

    const incoming = students
      .map((s) => ({
        lastName: titleCase(s.lastName),
        firstName: titleCase(s.firstName),
      }))
      .filter((s) => s.lastName && s.firstName);

    const seen = new Set<string>();
    const unique = incoming.filter((s) => {
      const key = buildSearchKey(s.lastName, s.firstName);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    const existing = await this.prisma.student.findMany({ where: { classId } });
    const byKey = new Map(existing.map((s) => [s.searchKey, s]));

    const toCreate = unique.filter((s) => !byKey.has(buildSearchKey(s.lastName, s.firstName)));
    const keepKeys = new Set(unique.map((s) => buildSearchKey(s.lastName, s.firstName)));
    const toArchive = existing.filter((s) => !keepKeys.has(s.searchKey) && !s.archivedAt);
    const toRestore = existing.filter((s) => keepKeys.has(s.searchKey) && s.archivedAt);

    await this.prisma.$transaction([
      ...(toCreate.length
        ? [
            this.prisma.student.createMany({
              data: toCreate.map((s) => ({
                classId,
                lastName: s.lastName,
                firstName: s.firstName,
                searchKey: buildSearchKey(s.lastName, s.firstName),
              })),
            }),
          ]
        : []),
      ...(toArchive.length
        ? [
            this.prisma.student.updateMany({
              where: { id: { in: toArchive.map((s) => s.id) } },
              data: { archivedAt: new Date() },
            }),
          ]
        : []),
      ...(toRestore.length
        ? [
            this.prisma.student.updateMany({
              where: { id: { in: toRestore.map((s) => s.id) } },
              data: { archivedAt: null },
            }),
          ]
        : []),
    ]);

    return {
      added: toCreate.length,
      archived: toArchive.length,
      restored: toRestore.length,
      total: unique.length,
    };
  }

  async updateStudent(studentId: string, lastName?: string, firstName?: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Ученик не найден');
    }
    const nextLast = lastName ? titleCase(lastName) : student.lastName;
    const nextFirst = firstName ? titleCase(firstName) : student.firstName;
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        lastName: nextLast,
        firstName: nextFirst,
        searchKey: buildSearchKey(nextLast, nextFirst),
      },
    });
    return { ok: true };
  }

  async removeStudent(studentId: string) {
    const works = await this.prisma.work.count({ where: { studentId } });
    if (works > 0) {
      // Работы ученика уже в журнале — карточку прячем, а не стираем.
      await this.prisma.student.update({ where: { id: studentId }, data: { archivedAt: new Date() } });
      return { archived: true };
    }
    await this.prisma.student.delete({ where: { id: studentId } });
    return { archived: false };
  }

  /**
   * Перевод класса: 7Б → 8Б. Если по классу уже есть работы, старая запись
   * уходит в архив вместе со своей историей, а ученики переезжают в новую —
   * прошлогодний срез 7Б так и остаётся срезом 7Б.
   */
  async promote(classId: string, number?: number, letter?: string) {
    const source = await this.prisma.schoolClass.findUnique({ where: { id: classId } });
    if (!source) {
      throw new NotFoundException('Класс не найден');
    }
    if (source.archivedAt) {
      throw new BadRequestException('Класс в архиве — переводить нечего');
    }

    const nextNumber = number ?? source.number + 1;
    const nextLetter = letter ?? source.letter;
    if (nextNumber > 11) {
      return this.archive(classId);
    }

    const occupied = await this.prisma.schoolClass.findFirst({
      where: { number: nextNumber, letter: nextLetter, archiveKey: '' },
    });
    if (occupied && occupied.id !== classId) {
      throw new BadRequestException(`Класс ${className(nextNumber, nextLetter)} уже существует`);
    }

    const assignments = await this.prisma.assignment.count({ where: { classId } });
    if (assignments === 0) {
      // Истории нет — это просто переименование.
      await this.prisma.schoolClass.update({
        where: { id: classId },
        data: { number: nextNumber, letter: nextLetter },
      });
      return { moved: false };
    }

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.schoolClass.create({
        data: { number: nextNumber, letter: nextLetter, createdById: source.createdById },
      });
      await tx.student.updateMany({ where: { classId, archivedAt: null }, data: { classId: created.id } });
      await tx.schoolClass.update({
        where: { id: classId },
        data: { archivedAt: new Date(), archiveKey: String(Date.now()) },
      });
    });
    return { moved: true };
  }

  async archive(classId: string) {
    await this.prisma.schoolClass.update({
      where: { id: classId },
      data: { archivedAt: new Date(), archiveKey: String(Date.now()) },
    });
    return { archived: true };
  }

  /** Одной кнопкой поднимаем всю школу на следующий учебный год. */
  async promoteAll() {
    const classes = await this.prisma.schoolClass.findMany({
      where: { archivedAt: null },
      orderBy: { number: 'desc' },
    });
    let promoted = 0;
    let graduated = 0;
    for (const item of classes) {
      if (item.number >= 11) {
        await this.archive(item.id);
        graduated += 1;
      } else {
        await this.promote(item.id);
        promoted += 1;
      }
    }
    return { promoted, graduated };
  }

  async remove(classId: string) {
    const assignments = await this.prisma.assignment.count({ where: { classId } });
    if (assignments > 0) {
      return this.archive(classId);
    }
    await this.prisma.schoolClass.delete({ where: { id: classId } });
    return { archived: false };
  }
}

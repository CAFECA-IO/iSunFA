import { prisma } from "@/lib/prisma";
import {
  Prisma,
  Reaction,
  ReactionType,
  Tag,
  Thread,
  ThreadTag,
  Comment,
} from "@/generated/client";

export interface ITalkRepository {
  getReaction(userId: string, commentId: string): Promise<Reaction | null>;
  deleteReaction(id: string): Promise<Reaction>;
  updateReaction(id: string, type: ReactionType): Promise<Reaction>;
  createReaction(
    userId: string,
    commentId: string,
    type: ReactionType,
  ): Promise<Reaction>;
  countReactions(commentId: string, type: ReactionType): Promise<number>;

  getThreadReaction(userId: string, threadId: string): Promise<Reaction | null>;
  createThreadReaction(
    userId: string,
    threadId: string,
    type: ReactionType,
  ): Promise<Reaction>;
  countThreadReactions(threadId: string, type: ReactionType): Promise<number>;

  getThreadById(threadId: string): Promise<Thread | null>;
  getCommentById(commentId: string): Promise<Comment | null>;
  listCommentsByThreadId(
    threadId: string,
  ): Promise<
    Prisma.CommentGetPayload<{
      include: { user: true; replyToUser: true; reactions: true };
    }>[]
  >;
  createComment(data: Prisma.CommentUncheckedCreateInput): Promise<Comment>;

  getThreadByIdWithFiles(
    threadId: string,
  ): Promise<Prisma.ThreadGetPayload<{ include: { files: true } }> | null>;
  getTagsByThreadId(threadId: string): Promise<Tag[]>;
  getReactionsByThreadId(threadId: string): Promise<Reaction[]>;
  countSharesByThreadId(threadId: string): Promise<number>;
  countCommentsByThreadId(threadId: string): Promise<number>;

  listThreadsWithCounts(): Promise<
    Prisma.ThreadGetPayload<{
      include: { _count: { select: { comments: true; shares: true } } };
    }>[]
  >;
  getThreadTagsByThreadIds(threadIds: string[]): Promise<ThreadTag[]>;
  getTagsByIds(tagIds: string[]): Promise<Tag[]>;
  getReactionCounts(): Promise<
    (Prisma.PickEnumerable<
      Prisma.ReactionGroupByOutputType,
      "threadId" | "type"
    > & { _count: { _all: number } })[]
  >;
  createThread(data: Prisma.ThreadUncheckedCreateInput): Promise<Thread>;
  createFiles(data: Prisma.FileCreateManyInput[]): Promise<Prisma.BatchPayload>;
  upsertTag(name: string): Promise<Tag>;
  createThreadTag(threadId: string, tagId: string): Promise<ThreadTag>;
}

export class TalkRepository implements ITalkRepository {
  async getReaction(userId: string, commentId: string) {
    return prisma.reaction.findUnique({
      where: {
        userId_commentId: { userId, commentId },
      },
    });
  }

  async deleteReaction(id: string) {
    return prisma.reaction.delete({
      where: { id },
    });
  }

  async updateReaction(id: string, type: ReactionType) {
    return prisma.reaction.update({
      where: { id },
      data: { type },
    });
  }

  async createReaction(userId: string, commentId: string, type: ReactionType) {
    return prisma.reaction.create({
      data: { userId, commentId, type },
    });
  }

  async countReactions(commentId: string, type: ReactionType) {
    return prisma.reaction.count({
      where: { commentId, type },
    });
  }

  async getThreadByIdWithFiles(threadId: string) {
    return prisma.thread.findUnique({
      where: { id: threadId },
      include: { files: true },
    });
  }

  async getTagsByThreadId(threadId: string) {
    const threadTags = await prisma.threadTag.findMany({
      where: { threadId },
    });
    return prisma.tag.findMany({
      where: { id: { in: threadTags.map((tt) => tt.tagId) } },
    });
  }

  async getReactionsByThreadId(threadId: string) {
    return prisma.reaction.findMany({
      where: { threadId },
    });
  }

  async countSharesByThreadId(threadId: string) {
    return prisma.share.count({
      where: { threadId },
    });
  }

  async countCommentsByThreadId(threadId: string) {
    return prisma.comment.count({
      where: { threadId },
    });
  }

  async listThreadsWithCounts() {
    return prisma.thread.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            comments: true,
            shares: true,
          },
        },
      },
    });
  }

  async getThreadTagsByThreadIds(threadIds: string[]) {
    return prisma.threadTag.findMany({
      where: { threadId: { in: threadIds } },
    });
  }

  async getTagsByIds(tagIds: string[]) {
    return prisma.tag.findMany({
      where: { id: { in: tagIds } },
    });
  }

  async getReactionCounts() {
    return prisma.reaction.groupBy({
      by: ["threadId", "type"],
      _count: { _all: true },
    });
  }

  async createThread(data: Prisma.ThreadUncheckedCreateInput) {
    return prisma.thread.create({ data });
  }

  async createFiles(data: Prisma.FileCreateManyInput[]) {
    return prisma.file.createMany({ data });
  }

  async upsertTag(name: string) {
    return prisma.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  async createThreadTag(threadId: string, tagId: string) {
    return prisma.threadTag.create({
      data: { threadId, tagId },
    });
  }

  async getThreadReaction(userId: string, threadId: string) {
    return prisma.reaction.findUnique({
      where: {
        userId_threadId: { userId, threadId },
      },
    });
  }

  async createThreadReaction(
    userId: string,
    threadId: string,
    type: ReactionType,
  ) {
    return prisma.reaction.create({
      data: { userId, threadId, type },
    });
  }

  async countThreadReactions(threadId: string, type: ReactionType) {
    return prisma.reaction.count({
      where: { threadId, type },
    });
  }

  async getThreadById(threadId: string) {
    return prisma.thread.findUnique({
      where: { id: threadId },
    });
  }

  async getCommentById(commentId: string) {
    return prisma.comment.findUnique({
      where: { id: commentId },
    });
  }

  async listCommentsByThreadId(threadId: string) {
    return prisma.comment.findMany({
      where: { threadId },
      include: {
        user: true,
        replyToUser: true,
        reactions: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createComment(data: Prisma.CommentUncheckedCreateInput) {
    return prisma.comment.create({ data });
  }
}

export const talkRepo = new TalkRepository();

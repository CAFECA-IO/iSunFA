import { prisma } from "@/lib/prisma";
import {
  Prisma,
  Reaction,
  ReactionType,
  Tag,
  Analysis,
  AnalysisTag,
  Comment,
} from "@/generated/client";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";

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

  getThreadReaction(
    userId: string,
    analysisId: string,
  ): Promise<Reaction | null>;
  createThreadReaction(
    userId: string,
    analysisId: string,
    type: ReactionType,
  ): Promise<Reaction>;
  countThreadReactions(analysisId: string, type: ReactionType): Promise<number>;

  getThreadById(analysisId: string): Promise<Analysis | null>;
  getCommentById(commentId: string): Promise<Comment | null>;
  listCommentsByThreadId(analysisId: string): Promise<
    Prisma.CommentGetPayload<{
      include: { user: true; replyToUser: true; reactions: true };
    }>[]
  >;
  createComment(data: Prisma.CommentUncheckedCreateInput): Promise<Comment>;

  getThreadByIdWithFiles(
    analysisId: string,
  ): Promise<Prisma.AnalysisGetPayload<{ include: { files: true } }> | null>;
  getTagsByThreadId(analysisId: string): Promise<Tag[]>;
  getReactionsByThreadId(analysisId: string): Promise<Reaction[]>;
  countSharesByThreadId(analysisId: string): Promise<number>;
  countCommentsByThreadId(analysisId: string): Promise<number>;

  listThreadsWithCounts(): Promise<
    Prisma.AnalysisGetPayload<{
      include: {
        _count: { select: { comments: true; reportShareTokens: true } };
      };
    }>[]
  >;

  getThreadTagsByThreadIds(analysisIds: string[]): Promise<AnalysisTag[]>;
  getTagsByIds(tagIds: string[]): Promise<Tag[]>;
  getReactionCounts(): Promise<
    (Prisma.PickEnumerable<
      Prisma.ReactionGroupByOutputType,
      "analysisId" | "type"
    > & { _count: { _all: number } })[]
  >;
  createThread(data: Prisma.AnalysisUncheckedCreateInput): Promise<Analysis>;
  createFiles(data: Prisma.FileCreateManyInput[]): Promise<Prisma.BatchPayload>;
  upsertTag(name: string): Promise<Tag>;
  createThreadTag(analysisId: string, tagId: string): Promise<AnalysisTag>;
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

  async getThreadByIdWithFiles(analysisId: string) {
    return prisma.analysis.findUnique({
      where: { id: analysisId },
      include: { files: true },
    });
  }

  async getTagsByThreadId(analysisId: string) {
    const threadTags = await prisma.analysisTag.findMany({
      where: { analysisId },
    });
    return prisma.tag.findMany({
      where: { id: { in: threadTags.map((tt) => tt.tagId) } },
    });
  }

  async getReactionsByThreadId(analysisId: string) {
    return prisma.reaction.findMany({
      where: { analysisId },
    });
  }

  async countSharesByThreadId(analysisId: string) {
    return prisma.reportShareToken.count({
      where: { analysisId },
    });
  }

  async countCommentsByThreadId(analysisId: string) {
    return prisma.comment.count({
      where: { analysisId },
    });
  }

  async listThreadsWithCounts() {
    return prisma.analysis.findMany({
      where: { type: ANALYSIS_CATEGORY.AI_CONSULTING },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            comments: true,
            reportShareTokens: true,
          },
        },
      },
    });
  }

  async getThreadTagsByThreadIds(analysisIds: string[]) {
    return prisma.analysisTag.findMany({
      where: { analysisId: { in: analysisIds } },
    });
  }

  async getTagsByIds(tagIds: string[]) {
    return prisma.tag.findMany({
      where: { id: { in: tagIds } },
    });
  }

  async getReactionCounts() {
    return prisma.reaction.groupBy({
      by: ["analysisId", "type"],
      _count: { _all: true },
    });
  }

  async createThread(data: Prisma.AnalysisUncheckedCreateInput) {
    return prisma.analysis.create({ data });
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

  async createThreadTag(analysisId: string, tagId: string) {
    return prisma.analysisTag.create({
      data: { analysisId, tagId },
    });
  }

  async getThreadReaction(userId: string, analysisId: string) {
    return prisma.reaction.findUnique({
      where: {
        userId_analysisId: { userId, analysisId },
      },
    });
  }

  async createThreadReaction(
    userId: string,
    analysisId: string,
    type: ReactionType,
  ) {
    return prisma.reaction.create({
      data: { userId, analysisId, type },
    });
  }

  async countThreadReactions(analysisId: string, type: ReactionType) {
    return prisma.reaction.count({
      where: { analysisId, type },
    });
  }

  async getThreadById(analysisId: string) {
    return prisma.analysis.findUnique({
      where: { id: analysisId },
    });
  }

  async getCommentById(commentId: string) {
    return prisma.comment.findUnique({
      where: { id: commentId },
    });
  }

  async listCommentsByThreadId(analysisId: string) {
    return prisma.comment.findMany({
      where: { analysisId },
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

  async deleteComment(commentId: string) {
    return prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }
}

export const talkRepo = new TalkRepository();

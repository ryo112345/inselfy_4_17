import "@typespec/http";
import "@typespec/openapi3";
import "../models/messaging.tsp";
import "../models/notification.tsp";
import "../models/job-application.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/messages")
@tag("Messaging")
@useAuth(Models.CandidateAuth)
interface CandidateMessaging {
  /** 会話開始（要ログイン） */
  @post
  @route("/conversations")
  @summary("Start a conversation as the candidate")
  startCandidateConversation(
    @body request: StartCandidateConversationRequest,
  ): {
    @statusCode statusCode: 201;
    @body conversation: ConversationResponse;
  } | AuthedNotFoundErrors;

  /** 会話一覧（要ログイン） */
  @get
  @route("/conversations")
  @summary("List conversations for the candidate")
  listCandidateConversations(
    /** 取得件数（1-100） */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): ConversationListResponse | AuthedErrors;

  /** 会話取得（要ログイン） */
  @get
  @route("/conversations/{conversationId}")
  @summary("Get a conversation as the candidate")
  getCandidateConversation(
    @path conversationId: Uuid,
  ): ConversationResponse | AuthedForbiddenErrors;

  /** メッセージ一覧（要ログイン） */
  @get
  @route("/conversations/{conversationId}/messages")
  @summary("List messages as the candidate")
  listCandidateMessages(
    @path conversationId: Uuid,
    @query limit?: int32,
    @query offset?: int32,
  ): MessageListResponse | AuthedForbiddenErrors;

  /** メッセージ送信（要ログイン） */
  @post
  @route("/conversations/{conversationId}/messages")
  @summary("Send a message as the candidate")
  sendCandidateMessage(
    @path conversationId: Uuid,
    @body request: SendMessageRequest,
  ): {
    @statusCode statusCode: 201;
    @body message: MessageResponse;
  } | AuthedForbiddenErrors;

  /** 既読化（要ログイン） */
  @post
  @route("/conversations/{conversationId}/read")
  @summary("Mark a conversation as read (candidate)")
  markCandidateConversationRead(
    @path conversationId: Uuid,
  ): StatusOkResponse | AuthedNotFoundErrors;

  /** 未読メッセージ数（要ログイン） */
  @get
  @route("/unread-count")
  @summary("Count unread messages for the candidate")
  countCandidateUnreadMessages(): UnreadCountResponse | AuthedErrors;
}

@route("/api/company/messages")
@tag("Messaging")
@useAuth(Models.CompanyAuth)
interface CompanyMessaging {
  /** 会話開始（企業認証）。既に会話が存在する場合は 409 */
  @post
  @route("/conversations")
  @summary("Start a conversation as the company")
  startCompanyConversation(
    @body request: StartConversationRequest,
  ): {
    @statusCode statusCode: 201;
    @body conversation: ConversationResponse;
  } | AuthedConflictErrors;

  /** 会話一覧（企業認証） */
  @get
  @route("/conversations")
  @summary("List conversations for the company")
  listCompanyConversations(
    @query limit?: int32,
    @query offset?: int32,
  ): ConversationListResponse | AuthedErrors;

  /** 会話取得（企業認証） */
  @get
  @route("/conversations/{conversationId}")
  @summary("Get a conversation as the company")
  getCompanyConversation(
    @path conversationId: Uuid,
  ): ConversationResponse | AuthedForbiddenErrors;

  /** メッセージ一覧（企業認証） */
  @get
  @route("/conversations/{conversationId}/messages")
  @summary("List messages as the company")
  listCompanyMessages(
    @path conversationId: Uuid,
    @query limit?: int32,
    @query offset?: int32,
  ): MessageListResponse | AuthedForbiddenErrors;

  /** メッセージ送信（企業認証） */
  @post
  @route("/conversations/{conversationId}/messages")
  @summary("Send a message as the company")
  sendCompanyMessage(
    @path conversationId: Uuid,
    @body request: SendMessageRequest,
  ): {
    @statusCode statusCode: 201;
    @body message: MessageResponse;
  } | AuthedForbiddenErrors;

  /** 既読化（企業認証） */
  @post
  @route("/conversations/{conversationId}/read")
  @summary("Mark a conversation as read (company)")
  markCompanyConversationRead(
    @path conversationId: Uuid,
  ): StatusOkResponse | AuthedNotFoundErrors;

  /** 未読メッセージ数（企業認証） */
  @get
  @route("/unread-count")
  @summary("Count unread messages for the company")
  countCompanyUnreadMessages(): UnreadCountResponse | AuthedErrors;
}

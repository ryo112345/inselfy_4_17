import "@typespec/http";
import "@typespec/openapi3";
import "../models/notification.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/notifications")
@tag("Notifications")
interface UserNotifications {
  /** 通知一覧（要ログイン） */
  @get
  @summary("List notifications for the authenticated user")
  listUserNotifications(
    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): NotificationListResponse | BadRequestError;

  /** 未読件数（要ログイン） */
  @get
  @route("/unread-count")
  @summary("Count unread notifications for the authenticated user")
  countUserUnreadNotifications(): UnreadCountResponse | BadRequestError;

  /** 既読化 */
  @post
  @route("/{id}/read")
  @summary("Mark a notification as read")
  markUserNotificationRead(
    @path id: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | BadRequestError;

  /** 全件既読化（要ログイン） */
  @post
  @route("/read-all")
  @summary("Mark all notifications as read for the authenticated user")
  markAllUserNotificationsRead(): {
    @statusCode statusCode: 204;
  } | BadRequestError;
}

@route("/api/company/notifications")
@tag("Notifications")
interface CompanyNotifications {
  /** 通知一覧（企業認証） */
  @get
  @summary("List notifications for the authenticated company")
  listCompanyNotifications(
    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): NotificationListResponse | BadRequestError;

  /** 未読件数（企業認証） */
  @get
  @route("/unread-count")
  @summary("Count unread notifications for the authenticated company")
  countCompanyUnreadNotifications(): UnreadCountResponse | BadRequestError;

  /** 既読化 */
  @post
  @route("/{id}/read")
  @summary("Mark a company notification as read")
  markCompanyNotificationRead(
    @path id: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | BadRequestError;

  /** 全件既読化（企業認証） */
  @post
  @route("/read-all")
  @summary("Mark all notifications as read for the authenticated company")
  markAllCompanyNotificationsRead(): {
    @statusCode statusCode: 204;
  } | BadRequestError;
}

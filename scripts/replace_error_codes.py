# -*- coding: utf-8 -*-
"""
批量将后端 ServiceException / R.fail 中的错误码常量替换成中文消息。
"""
import os
import re

ROOT = r"E:/coding_idea/CallNexus/CallNexus"

# 错误码 -> 中文消息
MAPPING = {
    "AGENT_ALREADY_HAS_ACTIVE_CALL": "当前坐席已存在通话，请先挂断",
    "ACTIVE_CALL_NOT_FOUND": "当前通话不存在或已结束",
    "CURRENT_USER_NOT_BOUND_TO_AGENT": "当前用户尚未绑定坐席",
    "AGENT_NOT_SIGNED_IN": "坐席未签入，请先签入",
    "AGENT_SIP_ACCOUNT_NOT_BOUND_OR_DISABLED": "坐席未绑定 SIP 分机或分机已停用",
    "PHONE_NUMBER_OUTBOUND_ROUTE_NOT_CONFIGURED": "未配置默认外呼号码路由",
    "CALL_RECORD_NOT_FOUND": "通话记录不存在",
    "CALL_RECORDING_REQUEST_INVALID": "通话录音上传参数不合法",
    "FREESWITCH_INTERNAL_TOKEN_INVALID": "FreeSWITCH 内部接口令牌无效",
    "AGENT_NOT_FOUND": "坐席不存在",
    "AGENT_UPDATE_CONFLICT": "坐席信息已被其他用户修改，请刷新后重试",
    "SIP_ACCOUNT_NOT_FOUND_OR_DISABLED": "SIP 分机不存在或已停用",
    "SIP_ACCOUNT_ALREADY_BOUND": "该 SIP 分机已被其他坐席绑定",
    "AGENT_CODE_ALREADY_EXISTS": "坐席工号已存在",
    "AGENT_USER_ALREADY_BOUND": "该用户已绑定其他坐席",
    "AGENT_DISABLED": "坐席已停用",
    "AGENT_STATUS_OFFLINE_REQUIRES_SIGN_OUT": "离线状态请使用签出操作",
    "FREESWITCH_GATEWAY_NOT_FOUND": "FreeSWITCH 网关不存在",
    "FREESWITCH_GATEWAY_UPDATE_CONFLICT": "FreeSWITCH 网关已被其他用户修改，请刷新后重试",
    "FREESWITCH_GATEWAY_CODE_ALREADY_EXISTS": "FreeSWITCH 网关编码已存在",
    "FREESWITCH_GATEWAY_SYNC_INTERRUPTED": "FreeSWITCH 网关同步已中断",
    "FREESWITCH_GATEWAY_CODE_INVALID": "FreeSWITCH 网关编码不合法",
    "FREESWITCH_NODE_NOT_FOUND_OR_DISABLED": "FreeSWITCH 节点不存在或已停用",
    "FREESWITCH_NODE_ESL_NOT_CONFIGURED": "FreeSWITCH 节点 ESL 未配置",
    "FREESWITCH_NODE_UPDATE_CONFLICT": "FreeSWITCH 节点已被其他用户修改，请刷新后重试",
    "FREESWITCH_NODE_IN_USE": "FreeSWITCH 节点正在被使用，无法删除",
    "FREESWITCH_NODE_IN_GROUP": "FreeSWITCH 节点已加入节点分组，无法删除",
    "FREESWITCH_NODE_CODE_ALREADY_EXISTS": "FreeSWITCH 节点编码已存在",
    "FREESWITCH_NODE_NOT_FOUND": "FreeSWITCH 节点不存在",
    "FREESWITCH_ESL_CONNECTION_FAILED": "连接 FreeSWITCH ESL 失败",
    "FREESWITCH_ESL_PASSWORD_INVALID": "FreeSWITCH ESL 密码错误",
    "FREESWITCH_ESL_ACCESS_DENIED": "FreeSWITCH ESL 鉴权被拒绝",
    "FREESWITCH_ESL_AUTH_REQUEST_NOT_RECEIVED": "未收到 FreeSWITCH ESL 鉴权请求",
    "CALL_RECORDING_MANUAL_UPLOAD_NOT_ALLOWED": "通话录音不允许手动上传",
    "CALL_RECORDING_PUBLISH_NOT_ALLOWED": "通话录音不允许发布到节点",
    "MEDIA_ASSET_CATEGORY_IMMUTABLE": "媒体分类不可修改",
    "MEDIA_ASSET_UPDATE_CONFLICT": "声音媒体已被其他用户修改，请刷新后重试",
    "MEDIA_ASSET_IN_USE": "声音媒体正在被使用，无法删除",
    "MEDIA_ASSET_IS_PUBLISHED": "声音媒体已发布，无法删除",
    "MEDIA_ASSET_NOT_FOUND": "声音媒体不存在",
    "MEDIA_FILE_REQUIRED": "请上传声音文件",
    "MEDIA_FILE_TYPE_INVALID": "声音文件格式不支持",
    "MEDIA_VERSION_NOT_FOUND": "声音媒体版本不存在",
    "MEDIA_SOURCE_NOT_FOUND": "声音媒体源文件不存在",
    "MEDIA_SOURCE_DOWNLOAD_FAILED": "声音媒体源文件下载失败",
    "MEDIA_AGENT_AUTH_FAILED": "媒体同步 Agent 鉴权失败",
    "MEDIA_SYNC_TASK_LEASE_INVALID": "媒体同步任务租约无效",
    "MEDIA_AGENT_TOKEN_HASH_FAILED": "生成媒体 Agent Token 失败",
    "NODE_GROUP_NOT_FOUND_OR_DISABLED": "节点分组不存在或已停用",
    "NODE_GROUP_UPDATE_CONFLICT": "节点分组已被其他用户修改，请刷新后重试",
    "NODE_GROUP_HAS_ACTIVE_PUBLICATION": "节点分组下存在已发布的媒体，无法删除",
    "NODE_GROUP_CONTAINS_INVALID_NODE": "节点分组包含无效或已停用的节点",
    "NODE_GROUP_CODE_EXISTS": "节点分组编码已存在",
    "NODE_GROUP_NOT_FOUND": "节点分组不存在",
    "PHONE_NUMBER_IVR_NOT_PUBLISHED_OR_NODE_UNAVAILABLE": "关联的 IVR 流程未发布，或目标节点不可用",
    "PHONE_NUMBER_IVR_TARGET_INVALID": "号码呼入路由目标 IVR 不合法",
    "PHONE_NUMBER_ROUTE_TARGET_REQUIRED": "请填写号码呼入路由目标",
    "PHONE_NUMBER_UPDATE_CONFLICT": "号码已被其他用户修改，请刷新后重试",
    "PHONE_NUMBER_ALREADY_EXISTS": "该号码已存在",
    "PHONE_NUMBER_NOT_FOUND": "号码不存在",
    "SIP_ACCOUNT_EXTENSION_ALREADY_EXISTS": "SIP 分机号已存在",
    "SIP_ACCOUNT_UPDATE_CONFLICT": "SIP 分机已被其他用户修改，请刷新后重试",
    "SIP_ACCOUNT_NODE_NOT_BOUND": "SIP 分机未绑定 FreeSWITCH 节点",
    "SIP_ACCOUNT_NOT_FOUND": "SIP 分机不存在",
    "CUSTOMER_NOT_FOUND": "客户不存在",
    "FORM_TEMPLATE_NOT_FOUND_OR_DISABLED": "表单模板不存在或已停用",
    "FORM_DATA_CONTAINS_UNKNOWN_FIELD": "表单提交包含未知字段",
    "FORM_FIELD_OPTION_VALUE_DUPLICATED": "表单字段选项值重复",
    "FORM_FIELD_OPTIONS_REQUIRED": "请配置表单字段选项",
    "FORM_FIELD_CODE_DUPLICATED": "表单字段编码重复",
    "FORM_FIELDS_REQUIRED": "请配置表单字段",
    "FORM_TEMPLATE_CODE_ALREADY_EXISTS": "表单模板编码已存在",
    "FORM_TEMPLATE_NOT_FOUND": "表单模板不存在",
    "FORM_FIELD_OPTION_INVALID": "表单字段选项值不合法",
    "FORM_FIELD_REQUIRES_ARRAY": "表单字段必须是数组",
    "TICKET_NOT_FOUND": "工单不存在",
    "INVALID_CALL_ID": "通话 ID 不合法",
    "INVALID_DIAL_VALUE": "拨号参数不合法",
    "IVR_DTMF_ROUTE_REQUIRED": "请为 DTMF 节点配置按键路由",
    "IVR_DTMF_KEY_INVALID": "DTMF 按键不合法",
    "IVR_DTMF_KEY_DUPLICATED": "DTMF 按键重复",
    "IVR_EXTENSION_REQUIRED": "请填写转接分机号",
    "IVR_NODE_TYPE_NOT_SUPPORTED": "不支持的 IVR 节点类型",
    "IVR_NODE_DEFAULT_ROUTE_REQUIRED": "请为 IVR 节点配置默认路由",
    "IVR_NODE_INVALID": "IVR 节点配置不合法",
    "IVR_NODE_ID_DUPLICATED": "IVR 节点 ID 重复",
    "IVR_TERMINAL_NODE_ROUTE_NOT_ALLOWED": "终止节点不能配置后续路由",
    "IVR_EDGE_CONDITION_NOT_ALLOWED": "当前 IVR 连线不允许配置条件",
    "IVR_EDGE_INVALID": "IVR 流程连线不合法",
    "IVR_GRAPH_JSON_INVALID": "IVR 流程图 JSON 不合法",
    "IVR_GRAPH_HAS_UNREACHABLE_NODE": "IVR 流程存在不可达节点",
    "IVR_GRAPH_EMPTY": "IVR 流程图为空",
    "IVR_START_NODE_MUST_BE_UNIQUE": "IVR 流程必须有且仅有一个起始节点",
    "IVR_START_NODE_REQUIRED": "请添加 IVR 起始节点",
    "IVR_FLOW_UPDATE_CONFLICT": "IVR 流程已被其他用户修改，请刷新后重试",
    "IVR_FLOW_IS_PUBLISHED": "IVR 流程已发布，无法删除",
    "IVR_FLOW_NOT_PUBLISHED": "IVR 流程尚未发布",
    "IVR_FLOW_NOT_FOUND": "IVR 流程不存在",
    "IVR_FLOW_CODE_EXISTS": "IVR 流程编码已存在",
    "IVR_VERSION_NOT_FOUND": "IVR 流程版本不存在",
    "IVR_MEDIA_NOT_SYNCED_TO_ALL_NODES": "IVR 提示音尚未同步到所有节点",
    "IVR_MEDIA_NOT_PUBLISHED": "IVR 提示音尚未发布",
}

# 按 key 长度从长到短排序，避免短前缀错误命中长 key
SORTED_KEYS = sorted(MAPPING.keys(), key=len, reverse=True)


def replace_in_text(text: str) -> tuple[str, int]:
    total = 0
    for code in SORTED_KEYS:
        msg = MAPPING[code]
        # case 1: "CODE:" + xxx  (拼接动态信息) -> "中文：" + xxx
        pattern_concat = f'"{code}:"'
        replacement_concat = f'"{msg}："'
        new_text, n = re.subn(re.escape(pattern_concat), replacement_concat, text)
        if n:
            text = new_text
            total += n
        # case 2: 普通整串 "CODE"
        pattern_full = f'"{code}"'
        replacement_full = f'"{msg}"'
        new_text, n = re.subn(re.escape(pattern_full), replacement_full, text)
        if n:
            text = new_text
            total += n
    return text, total


def main():
    changed_files = []
    total_replacements = 0
    for dirpath, _, filenames in os.walk(ROOT):
        if os.sep + "target" + os.sep in dirpath + os.sep:
            continue
        for fn in filenames:
            if not fn.endswith(".java"):
                continue
            path = os.path.join(dirpath, fn)
            with open(path, "r", encoding="utf-8") as f:
                src = f.read()
            new_src, n = replace_in_text(src)
            if n:
                with open(path, "w", encoding="utf-8", newline="") as f:
                    f.write(new_src)
                changed_files.append((path, n))
                total_replacements += n
    print(f"Modified files: {len(changed_files)}, total replacements: {total_replacements}")
    for path, n in changed_files:
        rel = os.path.relpath(path, ROOT)
        print(f"  {rel}: {n}")


if __name__ == "__main__":
    main()

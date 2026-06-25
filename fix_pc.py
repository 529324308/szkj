# -*- coding: utf-8 -*-
"""Fix garbled Chinese text and unclosed strings in PersonalCenter.vue."""
import re
from pathlib import Path

fpath = Path(r"d:\dxl\szkj\src\components\map\PersonalCenter.vue")
text = fpath.read_text(encoding="utf-8")

# ----------------------------------------------------------------
# Fix 1: garbled UTF-8 (multi-byte chars decoded as Latin-1)
# ----------------------------------------------------------------
garbled_fixes = {
    "浜岀骇瀵艰埅鐘舵€": "二级导航状态",
    "鎬昏€?: "总数",
    "鍦扮嚎涓婂凡鏈夊崟璇嶆浛鎹€?: "在线词典已无词汇替换",
    "浠诲姟鐘舵€?: "任务状态",
}
for bad, good in garbled_fixes.items():
    text = text.replace(bad, good)

# ----------------------------------------------------------------
# Fix 2: UTF-8 Chinese chars that were half-truncated (look like
# Chinese char followed by replacement char or end of line).
# The pattern: a Chinese char + U+FFFD (�) at end of a string.
# ----------------------------------------------------------------
# Replace any remaining � that are followed by end-quote or whitespace+end-quote
# These are the truncated Chinese chars at end of strings
text = re.sub(r'([\u4e00-\u9fff])\ufffd(\s*["\'])', r'\1\2', text)
text = re.sub(r'([\u4e00-\u9fff])\ufffd(["\'])', r'\1\2', text)
text = re.sub(r'([\u4e00-\u9fff])\ufffd([<\s])', r'\1\2', text)
text = re.sub(r'([\u4e00-\u9fff])\ufffd$', r'\1', text)

# ----------------------------------------------------------------
# Fix 3: Specific common truncated patterns found in the template
# ----------------------------------------------------------------
specific_fixes = {
    "权限映\u2029?": "权限映射",
    "员工、项目、日报模拟数\u2029?": "员工、项目、日报模拟数据",
    "单文件实\u2029?": "单文件实现",
    "个项\u2029?": "个项目",
    "进行中项\u2029?": "进行中项目",
    "今日日报提交\u2029?": "今日日报提交率",
    "已提交天\u2029?": "已提交天数",
    "待提交天\u2029?": "待提交天数",
    "今日状\u2029?": "今日状态",
    "提交\u2029?": "提交率",
    "今日已提\u2029?": "今日已提交",
    "未提\u2029?": "未提交",
    "近周期日\u2029?": "近周期日报",
    "项目状态分\u2029?": "项目状态分布",
    "即将到期项\u2029?": "即将到期项目",
    "未来 7 天内需关注的项\u2029?": "未来 7 天内需关注的项目",
    "未来 7 天暂无到期项\u2029?": "未来 7 天暂无到期项目",
    "日报提交\u2029?": "日报提交率",
    "滚动窗口最多显\u2029?5 条，新提交会自动顶替末尾消息\u2029?": "滚动窗口最多显示 5 条，新提交会自动顶替末尾消息",
    "统计基于当前测试角色实时切换，当前基准日期为 {{ dashboardTodayLabel }}\u2029?": "统计基于当前测试角色实时切换，当前基准日期为 {{ dashboardTodayLabel }}",
    "当前正在以\ufffd{{ roleLabelMap[currentRole] }}\ufffd视角查看页面，账号信息和数据范围会同步切换为对应测试样本\u2029?": "当前正在以\ufffd{{ roleLabelMap[currentRole] }}\ufffd视角查看页面，账号信息和数据范围会同步切换为对应测试样本",
    "部门成员概览\ufffd{{ scopedEmployees.length }} 浜": "部门成员概览\ufffd{{ scopedEmployees.length }} 人",
    "我的项目进度\ufffd{{ scopedProjects.length }} \ufffd": "我的项目进度\ufffd{{ scopedProjects.length }} 个",
    "快捷操作\ufffd{{ quickActions.length }} \ufffd": "快捷操作\ufffd{{ quickActions.length }} 个",
    "员工筛\u2029?": "员工筛选",
    "重置筛\u2029?": "重置筛选",
    "请选择所属部\u2029?": "请选择所属部门",
    "请输入员工姓\u2029?": "请输入员工姓名",
    "请输入邮\u2029?": "请输入邮箱",
    "请输入职\u2029?": "请输入职位",
    "请选择状\u2029?": "请选择状态",
    "确认删除该员工吗\u2029?": "确认删除该员工吗",
    "待审核项\u2029?": "待审核项目",
    "当前筛选结果覆\u2029?": "当前筛选结果覆盖",
    "当前筛选结果中\u2029?": "当前筛选结果中",
    "即将到期项目\ufffd{{ upcomingProjects.length }} \ufffd": "即将到期项目\ufffd{{ upcomingProjects.length }} 个",
    "已提\u2029?": "已提交",
    "近周期日\u2029?": "近周期日报",
    "日报\u2029?": "日报",
}
for bad, good in specific_fixes.items():
    text = text.replace(bad, good)

# ----------------------------------------------------------------
# Fix 4: 鏉 in report content - should be 条
# ----------------------------------------------------------------
text = text.replace("{{ reportsInRange.length }} 鏉", "{{ reportsInRange.length }} 条")

# ----------------------------------------------------------------
# Fix 5: Unclosed single-quoted strings in script sections.
# Heuristic: scan each line, count unescaped single quotes.
# If odd, close before // comment or at line end.
# ----------------------------------------------------------------
lines = text.splitlines()
fixed = []
for line in lines:
    # Skip lines inside <template> blocks (Vue won't parse script, but we
    # still need to be careful with template attribute strings)
    stripped = line.rstrip()
    # Count unescaped single quotes
    qcount = 0
    escaped = False
    for ch in stripped:
        if ch == '\\':
            escaped = not escaped
        elif ch == "'" and not escaped:
            qcount += 1
            escaped = False
        else:
            escaped = False

    if qcount % 2 == 1 and not stripped.endswith("'"):
        if '//' in stripped:
            idx = stripped.index('//')
            line = stripped[:idx].rstrip() + "'"
            rest = stripped[idx:]
            fixed.append(line)
            fixed.append(rest)
            continue
        else:
            line = stripped + "'"
    fixed.append(line)

text = "\n".join(fixed)

# ----------------------------------------------------------------
# Fix 6: Clean up any remaining isolated � in attribute values
# ----------------------------------------------------------------
text = re.sub(r'([\u4e00-\u9fff])�(["\s<>)])', r'\1\2', text)
text = re.sub(r'([\u4e00-\u9fff])�$', r'\1', text)

fpath.write_text(text, encoding="utf-8")
print("done")

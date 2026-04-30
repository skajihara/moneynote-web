package com.example.moneynote.domain.ledgerpermission;

public enum PermissionType {
    VIEWER,
    EDITOR,
    ADMIN,
    /** 帳簿作成者を表す仮想権限。ledger_permissions には保存されず ledger.owner で管理する。 */
    OWNER
}

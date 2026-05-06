package com.example.moneynote.domain.ledgerpermission;

import com.example.moneynote.common.exception.ConflictException;
import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.exception.ValidationException;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.ledgerpermission.dto.AddMemberRequest;
import com.example.moneynote.domain.ledgerpermission.dto.MemberResponse;
import com.example.moneynote.domain.ledgerpermission.dto.UpdateMemberRequest;
import com.example.moneynote.domain.user.User;
import com.example.moneynote.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

// Lombok @Builder の戻り値に対する IDE の Null 型安全警告を抑制する（実行時は問題なし）
@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class LedgerMemberService {

    private final LedgerAccessValidator accessValidator;
    private final LedgerPermissionRepository ledgerPermissionRepository;
    private final UserRepository userRepository;

    /**
     * 帳簿のメンバー一覧を取得する。オーナーを先頭に返す。
     */
    @Transactional(readOnly = true)
    public List<MemberResponse> getMembers(String ledgerId, String userId) {
        Ledger ledger = accessValidator.validate(ledgerId, userId);

        List<MemberResponse> result = new ArrayList<>();
        // オーナーを先頭に追加する（仮想的な OWNER レコード）
        User owner = ledger.getOwner();
        result.add(new MemberResponse(null, owner.getUserId(), owner.getUserName(),
                PermissionType.OWNER, null));

        // OWNER 以外のメンバーを追加する
        ledgerPermissionRepository.findByLedgerLedgerId(ledgerId)
                .stream()
                .filter(lp -> !lp.getUser().getUserId().equals(owner.getUserId()))
                .map(MemberResponse::from)
                .forEach(result::add);

        return result;
    }

    /**
     * メンバーを招待する。ADMIN以上のみ実行可能。
     */
    @Transactional
    public MemberResponse addMember(String ledgerId, AddMemberRequest request, String callerUserId) {
        Ledger ledger = accessValidator.validateAdminAccess(ledgerId, callerUserId);

        // OWNER 権限の直接付与は禁止
        if (request.permissionType() == PermissionType.OWNER) {
            throw new ValidationException("OWNER権限は付与できません");
        }

        String targetUserId = request.userId();

        // オーナーへの招待は禁止
        if (ledger.getOwner().getUserId().equals(targetUserId)) {
            throw new ValidationException("帳簿オーナーにメンバー権限を付与することはできません");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("ユーザーが見つかりません: " + targetUserId));

        // 重複招待チェック
        if (ledgerPermissionRepository.existsByLedgerLedgerIdAndUserUserId(ledgerId, targetUserId)) {
            throw new ConflictException("このユーザーはすでにメンバーです");
        }

        LedgerPermission perm = LedgerPermission.builder()
                .permissionId(IdGenerator.generateUnique("lperm_", ledgerPermissionRepository::existsById))
                .ledger(ledger)
                .user(targetUser)
                .permissionType(request.permissionType())
                .build();

        return MemberResponse.from(ledgerPermissionRepository.save(perm));
    }

    /**
     * メンバーの権限を変更する。ADMIN以上のみ実行可能。
     */
    @Transactional
    public MemberResponse updateMember(String ledgerId, String targetUserId,
                                       UpdateMemberRequest request, String callerUserId) {
        accessValidator.validateAdminAccess(ledgerId, callerUserId);

        // OWNER 権限への変更は禁止
        if (request.permissionType() == PermissionType.OWNER) {
            throw new ValidationException("OWNER権限には変更できません");
        }

        LedgerPermission perm = ledgerPermissionRepository
                .findByLedgerLedgerIdAndUserUserId(ledgerId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("指定されたメンバーが見つかりません"));

        perm.setPermissionType(request.permissionType());
        return MemberResponse.from(ledgerPermissionRepository.save(perm));
    }

    /**
     * メンバーを削除する。ADMIN以上のみ実行可能。OWNERは削除不可。
     */
    @Transactional
    public void removeMember(String ledgerId, String targetUserId, String callerUserId) {
        Ledger ledger = accessValidator.validateAdminAccess(ledgerId, callerUserId);

        // オーナーの削除は禁止
        if (ledger.getOwner().getUserId().equals(targetUserId)) {
            throw new ValidationException("帳簿オーナーをメンバーから削除することはできません");
        }

        LedgerPermission perm = ledgerPermissionRepository
                .findByLedgerLedgerIdAndUserUserId(ledgerId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("指定されたメンバーが見つかりません"));

        ledgerPermissionRepository.delete(perm);
    }
}

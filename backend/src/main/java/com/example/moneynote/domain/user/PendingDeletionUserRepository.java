package com.example.moneynote.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PendingDeletionUserRepository extends JpaRepository<PendingDeletionUser, String> {
}

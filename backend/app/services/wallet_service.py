from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.exceptions import InsufficientBalanceException, DuplicateEntityException, EntityNotFoundException
from app.models.wallet import Wallet, WalletTransaction, TransactionType, TransactionDirection, TransactionStatus


class WalletService:
    @staticmethod
    async def get_or_create_wallet(db: AsyncSession, user_id: str) -> Wallet:
        stmt = select(Wallet).where(Wallet.user_id == user_id)
        result = await db.execute(stmt)
        wallet = result.scalar_one_or_none()
        if not wallet:
            wallet = Wallet(
                user_id=user_id,
                currency="INR",
                available_balance_minor=0,
                locked_balance_minor=0,
                winning_balance_minor=0
            )
            db.add(wallet)
            await db.flush()
        return wallet

    @staticmethod
    async def get_transactions(
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[WalletTransaction]:
        wallet = await WalletService.get_or_create_wallet(db, user_id)
        stmt = (
            select(WalletTransaction)
            .where(WalletTransaction.wallet_id == wallet.id)
            .order_by(WalletTransaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def post_transaction(
        db: AsyncSession,
        user_id: str,
        type: TransactionType,
        amount_minor: int,
        direction: TransactionDirection,
        reference_type: str,
        reference_id: str,
        idempotency_key: str,
        description: str,
        is_winning: bool = False
    ) -> WalletTransaction:
        """
        Atomically post an immutable ledger transaction and update wallet balance.
        Guarantees idempotency via unique idempotency_key.
        """
        if amount_minor < 0:
            raise ValueError("Transaction amount must be non-negative")

        # 1. Check if transaction with this idempotency key already exists
        stmt = select(WalletTransaction).where(WalletTransaction.idempotency_key == idempotency_key)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            # Idempotent response: return existing record without double-crediting
            return existing

        # 2. Fetch and lock wallet row for update
        stmt = select(Wallet).where(Wallet.user_id == user_id).with_for_update()
        wallet = (await db.execute(stmt)).scalar_one_or_none()
        if not wallet:
            wallet = await WalletService.get_or_create_wallet(db, user_id)

        # 3. Calculate new balance
        if direction == TransactionDirection.DEBIT:
            if wallet.available_balance_minor < amount_minor:
                raise InsufficientBalanceException(
                    required_minor=amount_minor,
                    available_minor=wallet.available_balance_minor
                )
            wallet.available_balance_minor -= amount_minor
            if is_winning:
                wallet.winning_balance_minor = max(0, wallet.winning_balance_minor - amount_minor)
        elif direction == TransactionDirection.CREDIT:
            wallet.available_balance_minor += amount_minor
            if is_winning:
                wallet.winning_balance_minor += amount_minor

        balance_after = wallet.available_balance_minor

        # 4. Create immutable transaction record
        tx = WalletTransaction(
            wallet_id=wallet.id,
            type=type,
            amount_minor=amount_minor,
            direction=direction,
            balance_after_minor=balance_after,
            reference_type=reference_type,
            reference_id=reference_id,
            idempotency_key=idempotency_key,
            description=description,
            status=TransactionStatus.SUCCESS
        )
        db.add(tx)
        await db.flush()

        return tx

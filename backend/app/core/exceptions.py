from typing import Optional, Any, Dict


class AppException(Exception):
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 400, data: Optional[Any] = None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.data = data
        super().__init__(message)


class AuthenticationFailedException(AppException):
    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message=message, code="AUTH_FAILED", status_code=401)


class InsufficientPermissionsException(AppException):
    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(message=message, code="FORBIDDEN", status_code=403)


class EntityNotFoundException(AppException):
    def __init__(self, entity_name: str, identifier: Any):
        super().__init__(
            message=f"{entity_name} with identifier '{identifier}' was not found",
            code="NOT_FOUND",
            status_code=404
        )


class DuplicateEntityException(AppException):
    def __init__(self, message: str):
        super().__init__(message=message, code="DUPLICATE_ENTITY", status_code=409)


class MatchFullException(AppException):
    def __init__(self, message: str = "This match has reached full player capacity"):
        super().__init__(message=message, code="MATCH_FULL", status_code=409)


class RegistrationClosedException(AppException):
    def __init__(self, message: str = "Registration for this match is currently closed"):
        super().__init__(message=message, code="REGISTRATION_CLOSED", status_code=400)


class AlreadyRegisteredException(AppException):
    def __init__(self, message: str = "You are already registered for this match"):
        super().__init__(message=message, code="ALREADY_REGISTERED", status_code=409)


class InsufficientBalanceException(AppException):
    def __init__(self, required_minor: int, available_minor: int):
        super().__init__(
            message=f"Insufficient wallet balance. Required: {required_minor / 100:.2f}, Available: {available_minor / 100:.2f}",
            code="INSUFFICIENT_BALANCE",
            status_code=402,
            data={"required_minor": required_minor, "available_minor": available_minor}
        )


class DuplicateSettlementException(AppException):
    def __init__(self, match_id: str):
        super().__init__(
            message=f"Match {match_id} has already been settled and prizes credited",
            code="ALREADY_SETTLED",
            status_code=409
        )


class InvalidPaymentSignatureException(AppException):
    def __init__(self, message: str = "Payment signature verification failed"):
        super().__init__(message=message, code="INVALID_PAYMENT_SIGNATURE", status_code=400)


class RoomLockedException(AppException):
    def __init__(self, release_time: str):
        super().__init__(
            message=f"Room credentials are locked until {release_time}",
            code="ROOM_LOCKED",
            status_code=403
        )


class InvalidStateTransitionException(AppException):
    def __init__(self, current_status: str, target_status: str):
        super().__init__(
            message=f"Cannot transition match from {current_status} to {target_status}",
            code="INVALID_STATE_TRANSITION",
            status_code=400
        )


class FeatureDisabledException(AppException):
    def __init__(self, feature_name: str):
        super().__init__(
            message=f"The feature '{feature_name}' is currently disabled by administrator configuration",
            code="FEATURE_DISABLED",
            status_code=403
        )

from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    data: Optional[Any] = None


class ApiResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    error: Optional[ErrorDetail] = None

    @classmethod
    def ok(cls, data: T = None, message: str = "Success") -> "ApiResponse[T]":
        return cls(success=True, data=data, message=message, error=None)

    @classmethod
    def fail(cls, code: str, message: str, data: Any = None) -> "ApiResponse[Any]":
        return cls(success=False, data=None, message=None, error=ErrorDetail(code=code, message=message, data=data))

from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.profile import PlayerProfile


class LeaderboardService:
    @staticmethod
    async def get_leaderboard(
        db: AsyncSession,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        stmt = (
            select(PlayerProfile)
            .where(PlayerProfile.total_matches > 0)
            .order_by(
                desc(PlayerProfile.total_wins),
                desc(PlayerProfile.total_winnings_minor),
                desc(PlayerProfile.current_streak)
            )
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        profiles = list(result.scalars().all())

        ranked_list = []
        for rank, p in enumerate(profiles, start=offset + 1):
            win_rate = round((p.total_wins / p.total_matches * 100), 1) if p.total_matches > 0 else 0.0
            ranked_list.append({
                "rank": rank,
                "user_id": p.user_id,
                "display_name": p.display_name,
                "avatar_url": p.avatar_url,
                "free_fire_name": p.free_fire_name,
                "free_fire_uid": p.free_fire_uid,
                "total_matches": p.total_matches,
                "total_wins": p.total_wins,
                "total_losses": p.total_losses,
                "win_rate": win_rate,
                "total_winnings_minor": p.total_winnings_minor,
                "total_winnings_formatted": f"₹{p.total_winnings_minor / 100:.2f}",
                "current_streak": p.current_streak
            })

        return ranked_list

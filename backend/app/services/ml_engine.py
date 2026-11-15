import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session
from app.models.medication import ScheduledDose, AdherenceEvent, Medication

logger = logging.getLogger(__name__)

class CareIntelligenceEngine:
    """
    Care Intelligence Engine:
    Processes adherence events, identifies recurring behavioural patterns (time-of-day, weekends, specific drugs),
    detects statistical anomalies using Scikit-Learn IsolationForest, and generates transparent recommendations.
    """

    def calculate_adherence_analytics(self, db: Session, elderly_profile_id: str, days: int = 30) -> Dict[str, Any]:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        events = db.query(AdherenceEvent).filter(
            AdherenceEvent.elderly_profile_id == elderly_profile_id,
            AdherenceEvent.recorded_at >= cutoff_date
        ).all()

        doses = db.query(ScheduledDose).join(Medication).filter(
            Medication.elderly_profile_id == elderly_profile_id,
            ScheduledDose.scheduled_time >= cutoff_date
        ).all()

        total_doses = len(doses)
        if total_doses == 0:
            return {
                "overall_adherence_rate": 0.0,
                "total_scheduled_doses": 0,
                "taken_count": 0,
                "delayed_count": 0,
                "missed_count": 0,
                "unconfirmed_count": 0,
                "skipped_count": 0,
                "time_of_day_breakdown": {
                    "morning": {"rate": 0.0, "total": 0, "taken": 0},
                    "afternoon": {"rate": 0.0, "total": 0, "taken": 0},
                    "evening": {"rate": 0.0, "total": 0, "taken": 0},
                    "night": {"rate": 0.0, "total": 0, "taken": 0}
                },
                "weekly_trend": [],
                "patterns_identified": [],
                "recommendations": ["No adherence history yet. Set up medications to begin tracking."],
                "medication_breakdown": [],
                "ml_anomaly_alerts": []
            }

        data_rows = []
        for d in doses:
            d_time = d.scheduled_time
            if d_time.tzinfo is None:
                d_time = d_time.replace(tzinfo=timezone.utc)
            hour = d_time.hour
            time_slot = "morning" if 5 <= hour < 12 else "afternoon" if 12 <= hour < 17 else "evening" if 17 <= hour < 22 else "night"
            day_of_week = d_time.weekday()
            is_weekend = day_of_week in [5, 6]
            is_taken = d.status in ["taken", "delayed"]
            data_rows.append({
                "dose_id": d.id,
                "medication_id": d.medication_id,
                "medication_name": d.medication.name if d.medication else "Unknown",
                "status": d.status,
                "is_taken": 1 if is_taken else 0,
                "hour": hour,
                "time_slot": time_slot,
                "day_of_week": day_of_week,
                "is_weekend": is_weekend,
                "date_str": d_time.strftime("%Y-%m-%d")
            })

        df = pd.DataFrame(data_rows)

        taken_count = int((df["status"] == "taken").sum())
        delayed_count = int((df["status"] == "delayed").sum())
        missed_count = int((df["status"] == "missed").sum())
        unconfirmed_count = int((df["status"] == "unconfirmed").sum())
        skipped_count = int((df["status"] == "skipped").sum())
        
        confirmed_taken = taken_count + delayed_count
        overall_rate = round((confirmed_taken / total_doses) * 100, 1)

        time_slots = {}
        for slot in ["morning", "afternoon", "evening", "night"]:
            slot_df = df[df["time_slot"] == slot]
            slot_total = len(slot_df)
            slot_taken = int(slot_df["is_taken"].sum()) if slot_total > 0 else 0
            slot_rate = round((slot_taken / slot_total * 100), 1) if slot_total > 0 else 100.0
            time_slots[slot] = {
                "rate": slot_rate,
                "total": slot_total,
                "taken": slot_taken
            }

        last_7_days = [(datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)]
        weekly_trend = []
        for day_str in last_7_days:
            day_df = df[df["date_str"] == day_str]
            day_total = len(day_df)
            day_taken = int(day_df["is_taken"].sum()) if day_total > 0 else 0
            day_rate = round((day_taken / day_total * 100), 1) if day_total > 0 else 100.0
            day_name = datetime.strptime(day_str, "%Y-%m-%d").strftime("%a")
            weekly_trend.append({
                "date": day_str,
                "day": day_name,
                "rate": day_rate,
                "total": day_total,
                "taken": day_taken,
                "missed": day_total - day_taken
            })

        patterns = []
        recommendations = []

        evening_total = time_slots["evening"]["total"]
        if evening_total >= 3 and time_slots["evening"]["rate"] < 75.0:
            patterns.append({
                "type": "EVENING_DEFICIT",
                "severity": "medium",
                "title": "Evening Schedule Adherence Dip",
                "description": f"Evening medications have a confirmation rate of {time_slots['evening']['rate']}%, significantly lower than morning."
            })
            recommendations.append(
                "Your evening medication has remained unconfirmed several times. Would you like to add an additional reminder or nominate a family member or caretaker to assist?"
            )

        weekend_df = df[df["is_weekend"] == True]
        weekday_df = df[df["is_weekend"] == False]
        weekend_rate = round((weekend_df["is_taken"].sum() / len(weekend_df) * 100), 1) if len(weekend_df) > 0 else 100.0
        weekday_rate = round((weekday_df["is_taken"].sum() / len(weekday_df) * 100), 1) if len(weekday_df) > 0 else 100.0

        if len(weekend_df) >= 4 and (weekday_rate - weekend_rate) >= 15.0:
            patterns.append({
                "type": "WEEKEND_DROP",
                "severity": "low",
                "title": "Weekend Adherence Variability",
                "description": f"Adherence drops from {weekday_rate}% on weekdays to {weekend_rate}% on Saturdays and Sundays."
            })
            recommendations.append(
                "Weekend schedules often differ from weekday routines. Consider setting a distinctive chime or pillbox organizer for weekend mornings."
            )

        # Medication-specific breakdown
        medication_breakdown = []
        for med_name, group in df.groupby("medication_name"):
            med_total = len(group)
            med_taken = int(group["is_taken"].sum())
            med_rate = round((med_taken / med_total * 100), 1) if med_total > 0 else 100.0
            is_risk = med_rate < 75.0
            medication_breakdown.append({
                "medication_name": med_name,
                "total_doses": med_total,
                "taken_doses": med_taken,
                "adherence_rate": med_rate,
                "risk_flag": is_risk
            })

            if med_total >= 4 and is_risk:
                patterns.append({
                    "type": "SPECIFIC_MEDICATION_STRUGGLE",
                    "severity": "high",
                    "title": f"Frequent Misses for {med_name}",
                    "description": f"{med_name} adherence is currently at {med_rate}% ({med_taken}/{med_total} doses confirmed)."
                })
                recommendations.append(
                    f"Doses of {med_name} are frequently unconfirmed. Review the dosage schedule with your doctor at your next appointment."
                )

        # Scikit-Learn Anomaly Detection using IsolationForest
        ml_anomalies = []
        if len(df) >= 10:
            try:
                feature_matrix = df[["hour", "day_of_week", "is_taken"]].values
                iso = IsolationForest(contamination=0.10, random_state=42)
                preds = iso.fit_predict(feature_matrix)
                outlier_indices = np.where(preds == -1)[0]
                if len(outlier_indices) > 0:
                    for idx in outlier_indices[:3]:
                        row = df.iloc[idx]
                        ml_anomalies.append({
                            "medication_name": row["medication_name"],
                            "status": row["status"],
                            "date": row["date_str"],
                            "time_slot": row["time_slot"],
                            "explanation": f"Statistical outlier detected by Scikit-learn IsolationForest ({row['status']} dose at hour {row['hour']})."
                        })
            except Exception as e:
                logger.debug(f"Scikit-learn model note: {e}")

        if not recommendations:
            recommendations.append("Excellent consistency! All medication timings are currently being tracked and confirmed on schedule.")

        return {
            "overall_adherence_rate": overall_rate,
            "total_scheduled_doses": total_doses,
            "taken_count": taken_count,
            "delayed_count": delayed_count,
            "missed_count": missed_count,
            "unconfirmed_count": unconfirmed_count,
            "skipped_count": skipped_count,
            "time_of_day_breakdown": time_slots,
            "weekly_trend": weekly_trend,
            "patterns_identified": patterns,
            "recommendations": recommendations,
            "weekend_adherence_rate": weekend_rate,
            "weekday_adherence_rate": weekday_rate,
            "medication_breakdown": medication_breakdown,
            "ml_anomaly_alerts": ml_anomalies
        }

care_intelligence_engine = CareIntelligenceEngine()

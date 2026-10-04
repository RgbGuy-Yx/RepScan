import base64
import io
from typing import Any, Dict, List, Optional
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


def _fig_to_base64(fig: plt.Figure) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=180, bbox_inches="tight", facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close(fig)
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def generate_themes_bar_chart(themes: List[Dict[str, Any]]) -> Optional[str]:
    """
    Renders a clean horizontal bar chart for top themes with mention counts
    and sentiment color accents.
    """
    if not themes:
        return None

    top_themes = themes[:8][::-1]  # Reverse for top-down display
    names = [t.get("theme", "Unknown") for t in top_themes]
    counts = [t.get("count", 0) for t in top_themes]
    pos_counts = [t.get("positiveCount", t.get("positive_count", 0)) for t in top_themes]
    neg_counts = [t.get("negativeCount", t.get("negative_count", 0)) for t in top_themes]
    neu_counts = [t.get("neutralCount", t.get("neutral_count", 0)) for t in top_themes]

    if sum(counts) == 0:
        return None

    fig, ax = plt.subplots(figsize=(7.5, max(3.0, len(top_themes) * 0.45)), facecolor="#ffffff")
    y_pos = np.arange(len(names))

    # Stacked horizontal bar chart (Positive = Emerald, Neutral = Slate, Negative = Rose)
    p1 = ax.barh(y_pos, pos_counts, color="#10b981", height=0.6, label="Positive")
    p2 = ax.barh(y_pos, neu_counts, left=pos_counts, color="#94a3b8", height=0.6, label="Neutral")
    left_neg = [p + n for p, n in zip(pos_counts, neu_counts)]
    p3 = ax.barh(y_pos, neg_counts, left=left_neg, color="#f43f5e", height=0.6, label="Negative")

    # Value labels at the end of each bar
    for i, total in enumerate(counts):
        ax.text(total + 0.3, i, f"{total}", va="center", ha="left", fontsize=9, fontweight="bold", color="#334155")

    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=9.5, fontweight="medium", color="#1e293b")
    ax.set_xlabel("Mention Count", fontsize=9, color="#64748b", labelpad=8)
    ax.grid(axis="x", linestyle="--", alpha=0.3, color="#cbd5e1")
    ax.set_axisbelow(True)

    # Clean styling
    for spine in ["top", "right", "left", "bottom"]:
        ax.spines[spine].set_visible(False)
    ax.tick_params(left=False, bottom=True, colors="#64748b")
    ax.legend(loc="upper right", frameon=False, fontsize=8.5)

    plt.tight_layout()
    return _fig_to_base64(fig)


def generate_sentiment_donut_chart(sentiment: Dict[str, Any]) -> Optional[str]:
    """
    Renders a modern donut chart showing positive, neutral, and negative sentiment distribution.
    """
    pos = sentiment.get("positive", 0)
    neu = sentiment.get("neutral", 0)
    neg = sentiment.get("negative", 0)
    total = pos + neu + neg

    if total == 0:
        return None

    labels = ["Positive", "Neutral", "Negative"]
    values = [pos, neu, neg]
    colors = ["#10b981", "#94a3b8", "#f43f5e"]

    # Filter out 0 slices
    active_labels = []
    active_values = []
    active_colors = []
    for l, v, c in zip(labels, values, colors):
        if v > 0:
            active_labels.append(f"{l} ({round(v / total * 100)}%)")
            active_values.append(v)
            active_colors.append(c)

    fig, ax = plt.subplots(figsize=(4.5, 3.2), facecolor="#ffffff")
    wedges, texts = ax.pie(
        active_values,
        labels=active_labels,
        colors=active_colors,
        startangle=140,
        textprops={"fontsize": 8.5, "color": "#1e293b", "fontweight": "medium"},
        wedgeprops=dict(width=0.38, edgecolor="#ffffff", linewidth=2),
    )

    # Center circle for donut hole with total reviews count
    ax.text(0, 0.08, f"{total}", ha="center", va="center", fontsize=15, fontweight="bold", color="#0f172a")
    ax.text(0, -0.15, "Reviews", ha="center", va="center", fontsize=8, color="#64748b")

    ax.axis("equal")
    plt.tight_layout()
    return _fig_to_base64(fig)


def generate_trend_chart(trends: List[Dict[str, Any]]) -> Optional[str]:
    """
    Renders a clean dual-axis trend line/bar chart for review volume and average rating trajectory.
    """
    if not trends or len(trends) < 2:
        return None

    labels = [t.get("label", "") for t in trends]
    volumes = [t.get("count", 0) for t in trends]
    ratings = [t.get("average_rating") or t.get("averageRating") or 0.0 for t in trends]

    fig, ax1 = plt.subplots(figsize=(7.5, 2.8), facecolor="#ffffff")

    # Volume bars
    x = np.arange(len(labels))
    bars = ax1.bar(x, volumes, width=0.45, color="#e2e8f0", label="Volume")
    ax1.set_ylabel("Review Volume", color="#64748b", fontsize=8.5)
    ax1.tick_params(axis="y", labelcolor="#64748b", labelsize=8)
    ax1.set_xticks(x)
    ax1.set_xticklabels(labels, fontsize=8, color="#475569", rotation=15, ha="right")
    ax1.grid(axis="y", linestyle="--", alpha=0.3, color="#e2e8f0")

    # Rating line on secondary axis
    valid_ratings = [r for r in ratings if r > 0]
    if valid_ratings:
        ax2 = ax1.twinx()
        ax2.plot(x, ratings, color="#0284c7", marker="o", linewidth=2, markersize=4, label="Avg Rating")
        ax2.set_ylabel("Rating (1-5★)", color="#0284c7", fontsize=8.5)
        ax2.tick_params(axis="y", labelcolor="#0284c7", labelsize=8)
        ax2.set_ylim(1.0, 5.2)
        for spine in ["top", "left", "bottom", "right"]:
            ax2.spines[spine].set_visible(False)

    for spine in ["top", "right", "left", "bottom"]:
        ax1.spines[spine].set_visible(False)

    plt.tight_layout()
    return _fig_to_base64(fig)

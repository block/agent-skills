#!/usr/bin/env python3
"""
RP-WHY Baseline Analysis Tool

Analyzes historical Goose sessions to establish a DOK/Gas Town baseline.
Uses all available session data (not limited to any time period).

Usage:
    python rp_why_baseline.py init      # Generate baseline analysis
    python rp_why_baseline.py compare   # Compare to baseline
    python rp_why_baseline.py export    # Export baseline as JSON
    python rp_why_baseline.py show      # Show current baseline
"""

import sqlite3
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from collections import defaultdict


class RPWhyBaseline:
    """Analyze Goose sessions for DOK baseline assessment"""
    
    # Database and config paths
    SESSIONS_DB = Path.home() / ".local/share/goose/sessions/sessions.db"
    BASELINE_FILE = Path.home() / ".config/goose/rp-why-baseline.json"
    
    # DOK classification patterns
    DOK_PATTERNS = {
        1: [
            r'\bhow do i\b', r'\bwhat is\b', r'\bsyntax\b', r'\bcommand\b',
            r'\bwhere\b', r'\bshow me\b', r'\bexample\b', r'\bhelp with\b',
            r'\bwhat\'s the\b', r'\bhow to\b', r'\bcan you show\b'
        ],
        2: [
            r'\bimplement\b', r'\bdebug\b', r'\bfix\b', r'\brefactor\b',
            r'\btest\b', r'\badd\b', r'\bupdate\b', r'\bcreate\b',
            r'\bbuild\b', r'\bwrite\b', r'\bmodify\b', r'\bchange\b',
            r'\bremove\b', r'\bdelete\b', r'\binstall\b', r'\bsetup\b'
        ],
        3: [
            r'\bdesign\b', r'\barchitect\b', r'\banalyze\b', r'\bcompare\b',
            r'\btrade-?off\b', r'\bbest approach\b', r'\bevaluate\b',
            r'\bstrategy\b', r'\bwhy\b', r'\bimplications\b', r'\bshould we\b',
            r'\breview\b', r'\boptimize\b', r'\bimprove\b', r'\balternative\b',
            r'\bpros and cons\b', r'\bdecision\b'
        ],
        4: [
            r'\bresearch\b', r'\bnovel\b', r'\binnovate\b', r'\btransform\b',
            r'\bframework\b', r'\blong-term\b', r'\bevolve\b', r'\bvision\b',
            r'\bbreakthrough\b', r'\bsystematic\b', r'\bparadigm\b',
            r'\bfundamental\b', r'\bpioneer\b', r'\bgroundbreaking\b'
        ]
    }
    
    # Stage thresholds
    STAGE_THRESHOLDS = [
        (3.5, 5, 7),   # DOK >= 3.5 and domains >= 5 -> Stage 7
        (3.2, 4, 6),   # DOK >= 3.2 and domains >= 4 -> Stage 6 (solid)
        (2.8, 3, 6),   # DOK >= 2.8 and domains >= 3 -> Stage 6 (developing)
        (2.5, 2, 5),   # DOK >= 2.5 and domains >= 2 -> Stage 5 (ready for 6)
        (2.0, 1, 5),   # DOK >= 2.0 -> Stage 5 (solid)
        (0.0, 0, 5),   # Default -> Stage 5 (developing)
    ]
    
    DOK_NAMES = {
        1: "Recall & Reproduction",
        2: "Skills & Application", 
        3: "Strategic Thinking",
        4: "Extended Thinking"
    }
    
    STAGE_NAMES = {
        5: "Senior Developer",
        6: "Staff/Principal Engineer",
        7: "Distinguished Engineer"
    }
    
    def __init__(self):
        self.conn = None
        
    def connect(self) -> bool:
        """Connect to the sessions database"""
        if not self.SESSIONS_DB.exists():
            print(f"❌ Sessions database not found at {self.SESSIONS_DB}")
            return False
        
        try:
            self.conn = sqlite3.connect(str(self.SESSIONS_DB))
            self.conn.row_factory = sqlite3.Row
            return True
        except sqlite3.Error as e:
            print(f"❌ Database connection error: {e}")
            return False
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    def classify_dok(self, text: str) -> Tuple[int, float, List[str]]:
        """
        Classify text by DOK level
        
        Returns:
            (dok_level, confidence, matched_patterns)
        """
        if not text:
            return (2, 0.3, [])  # Default to DOK 2
        
        text_lower = text.lower()
        scores = {1: 0, 2: 0, 3: 0, 4: 0}
        matched = []
        
        for level, patterns in self.DOK_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    scores[level] += 1
                    # Extract the matched word for display
                    match = re.search(pattern, text_lower)
                    if match:
                        matched.append(match.group().strip())
        
        total_matches = sum(scores.values())
        if total_matches == 0:
            return (2, 0.3, [])  # Default to DOK 2
        
        # Find highest scoring level
        max_score = max(scores.values())
        level = max(k for k, v in scores.items() if v == max_score)
        confidence = max_score / total_matches if total_matches > 0 else 0.3
        
        return (level, min(confidence, 1.0), matched[:5])
    
    def get_data_summary(self) -> Dict:
        """Get summary of available session data"""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            SELECT 
                MIN(created_at) as earliest,
                MAX(created_at) as latest,
                COUNT(*) as total_sessions
            FROM sessions
            WHERE session_type = 'user'
        """)
        row = cursor.fetchone()
        
        if not row or not row['earliest']:
            return {'sessions': 0, 'earliest': None, 'latest': None, 'days': 0}
        
        earliest = datetime.fromisoformat(row['earliest'].replace('Z', '+00:00')) if row['earliest'] else None
        latest = datetime.fromisoformat(row['latest'].replace('Z', '+00:00')) if row['latest'] else None
        days = (latest - earliest).days if earliest and latest else 0
        
        return {
            'sessions': row['total_sessions'],
            'earliest': row['earliest'],
            'latest': row['latest'],
            'days': days
        }
    
    def get_all_user_prompts(self) -> List[Dict]:
        """Get all user text prompts from all sessions"""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            SELECT 
                m.session_id,
                s.name as session_name,
                s.created_at as session_date,
                s.working_dir,
                m.content_json,
                m.created_timestamp
            FROM messages m
            JOIN sessions s ON m.session_id = s.id
            WHERE m.role = 'user'
                AND s.session_type = 'user'
            ORDER BY m.created_timestamp
        """)
        
        prompts = []
        for row in cursor.fetchall():
            try:
                content = json.loads(row['content_json'])
                # Extract text from content array
                text = None
                for item in content:
                    if isinstance(item, dict) and item.get('type') == 'text':
                        text = item.get('text', '')
                        break
                
                if text:
                    prompts.append({
                        'session_id': row['session_id'],
                        'session_name': row['session_name'],
                        'session_date': row['session_date'],
                        'working_dir': row['working_dir'],
                        'text': text,
                        'timestamp': row['created_timestamp']
                    })
            except (json.JSONDecodeError, TypeError):
                continue
        
        return prompts
    
    def get_sessions_by_directory(self) -> Dict[str, List]:
        """Get sessions grouped by working directory"""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            SELECT 
                working_dir,
                COUNT(*) as session_count,
                SUM(total_tokens) as total_tokens
            FROM sessions
            WHERE session_type = 'user'
            GROUP BY working_dir
            ORDER BY session_count DESC
        """)
        
        return {row['working_dir']: {
            'count': row['session_count'],
            'tokens': row['total_tokens'] or 0
        } for row in cursor.fetchall()}
    
    def get_weekly_breakdown(self, prompts: List[Dict]) -> List[Dict]:
        """Calculate DOK scores by week"""
        weekly = defaultdict(list)
        
        for prompt in prompts:
            if prompt.get('session_date'):
                try:
                    date = datetime.fromisoformat(prompt['session_date'].replace('Z', '+00:00'))
                    week = date.strftime('%Y-W%W')
                    dok_level, _, _ = self.classify_dok(prompt['text'])
                    weekly[week].append(dok_level)
                except (ValueError, TypeError):
                    continue
        
        result = []
        for week in sorted(weekly.keys()):
            scores = weekly[week]
            avg = sum(scores) / len(scores) if scores else 0
            result.append({
                'week': week,
                'avg_dok': round(avg, 2),
                'prompt_count': len(scores)
            })
        
        return result
    
    def estimate_stage(self, avg_dok: float, domain_count: int) -> int:
        """Estimate Gas Town stage based on DOK and domain breadth"""
        for dok_threshold, domain_threshold, stage in self.STAGE_THRESHOLDS:
            if avg_dok >= dok_threshold and domain_count >= domain_threshold:
                return stage
        return 5
    
    def calculate_trajectory(self, weekly_scores: List[Dict]) -> str:
        """Determine if DOK is improving, stable, or declining"""
        if len(weekly_scores) < 2:
            return "insufficient_data"
        
        # Compare first half to second half
        mid = len(weekly_scores) // 2
        first_half = [w['avg_dok'] for w in weekly_scores[:mid]]
        second_half = [w['avg_dok'] for w in weekly_scores[mid:]]
        
        first_avg = sum(first_half) / len(first_half) if first_half else 0
        second_avg = sum(second_half) / len(second_half) if second_half else 0
        
        diff = second_avg - first_avg
        
        if diff > 0.2:
            return "improving"
        elif diff < -0.2:
            return "declining"
        else:
            return "stable"
    
    def generate_baseline(self) -> Dict:
        """Generate complete baseline analysis"""
        if not self.connect():
            return None
        
        try:
            # Get data summary
            summary = self.get_data_summary()
            
            if summary['sessions'] == 0:
                return {
                    'error': 'no_data',
                    'message': 'No sessions found in database'
                }
            
            # Get all prompts
            prompts = self.get_all_user_prompts()
            
            # Classify all prompts
            dok_counts = {1: 0, 2: 0, 3: 0, 4: 0}
            dok_scores = []
            
            for prompt in prompts:
                dok_level, confidence, _ = self.classify_dok(prompt['text'])
                dok_counts[dok_level] += 1
                dok_scores.append(dok_level)
            
            total_prompts = sum(dok_counts.values())
            
            # Calculate distributions
            dok_distribution = {
                f'dok{k}': round(v / total_prompts * 100, 1) if total_prompts > 0 else 0
                for k, v in dok_counts.items()
            }
            dok_distribution_counts = {f'dok{k}_count': v for k, v in dok_counts.items()}
            
            # Calculate average DOK
            avg_dok = sum(dok_scores) / len(dok_scores) if dok_scores else 2.0
            
            # Get domain info
            directories = self.get_sessions_by_directory()
            domain_count = len(directories)
            
            # Get weekly breakdown
            weekly_scores = self.get_weekly_breakdown(prompts)
            
            # Calculate trajectory
            trajectory = self.calculate_trajectory(weekly_scores)
            
            # Estimate stage
            estimated_stage = self.estimate_stage(avg_dok, domain_count)
            
            # Build baseline
            baseline = {
                'generated_at': datetime.now().isoformat(),
                'period': {
                    'start': summary['earliest'],
                    'end': summary['latest'],
                    'days': summary['days']
                },
                'sessions_analyzed': summary['sessions'],
                'prompts_classified': total_prompts,
                'dok_distribution': dok_distribution,
                'dok_distribution_counts': dok_distribution_counts,
                'average_dok_score': round(avg_dok, 2),
                'estimated_stage': estimated_stage,
                'domain_count': domain_count,
                'domains': {k: v for k, v in list(directories.items())[:10]},
                'trajectory': trajectory,
                'weekly_scores': weekly_scores[-12:],  # Last 12 weeks
            }
            
            return baseline
            
        finally:
            self.close()
    
    def save_baseline(self, baseline: Dict) -> bool:
        """Save baseline to config file"""
        try:
            self.BASELINE_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(self.BASELINE_FILE, 'w') as f:
                json.dump(baseline, f, indent=2)
            return True
        except IOError as e:
            print(f"❌ Error saving baseline: {e}")
            return False
    
    def load_baseline(self) -> Optional[Dict]:
        """Load existing baseline"""
        if not self.BASELINE_FILE.exists():
            return None
        
        try:
            with open(self.BASELINE_FILE, 'r') as f:
                return json.load(f)
        except (IOError, json.JSONDecodeError) as e:
            print(f"❌ Error loading baseline: {e}")
            return None
    
    def format_bar(self, percentage: float, width: int = 10) -> str:
        """Create a visual progress bar"""
        filled = int(percentage / 100 * width)
        return '█' * filled + '░' * (width - filled)
    
    def print_baseline_report(self, baseline: Dict):
        """Print formatted baseline report"""
        if 'error' in baseline:
            print(f"\n❌ {baseline['message']}")
            return
        
        sessions = baseline['sessions_analyzed']
        
        # Determine report type based on data volume
        if sessions < 5:
            print("\n⚠️  LIMITED DATA AVAILABLE")
            print("─" * 62)
            print(f"Found only {sessions} sessions. This baseline will improve as you use Goose more.")
            print()
        elif sessions < 20:
            print("\n📊 EARLY BASELINE")
            print("─" * 62)
            print(f"Based on {sessions} sessions. Trends may stabilize with more data.")
            print()
        
        # Main report
        print("╔══════════════════════════════════════════════════════════════╗")
        print("║       🪞 RP-WHY INIT: Baseline Analysis                      ║")
        print("╚══════════════════════════════════════════════════════════════╝")
        print()
        
        # Data Summary
        print("📊 DATA SUMMARY")
        print("─" * 62)
        period = baseline['period']
        print(f"Period Analyzed: {period['start'][:10]} to {period['end'][:10]} ({period['days']} days)")
        print(f"Sessions Analyzed: {baseline['sessions_analyzed']} sessions")
        print(f"Prompts Classified: {baseline['prompts_classified']} user prompts")
        print()
        
        # DOK Distribution
        print("📈 OVERALL DOK DISTRIBUTION")
        print("─" * 62)
        dist = baseline['dok_distribution']
        counts = baseline['dok_distribution_counts']
        for i in range(1, 5):
            pct = dist[f'dok{i}']
            count = counts[f'dok{i}_count']
            bar = self.format_bar(pct)
            print(f"DOK {i} ({self.DOK_NAMES[i][:11]:11}): {bar} {pct:5.1f}%  ({count} prompts)")
        print()
        
        # Weekly Trend
        weekly = baseline.get('weekly_scores', [])
        if len(weekly) >= 2:
            print("📉 DOK TREND OVER TIME")
            print("─" * 62)
            for week_data in weekly[-6:]:  # Show last 6 weeks
                week = week_data['week']
                avg = week_data['avg_dok']
                bar = self.format_bar(avg / 4 * 100)
                print(f"{week}: {avg:.1f} {bar}")
            
            trajectory = baseline['trajectory']
            trajectory_symbol = {'improving': '↑', 'stable': '→', 'declining': '↓'}.get(trajectory, '?')
            print(f"\nTrajectory: {trajectory_symbol} {trajectory.title()}")
            print()
        
        # Baseline Assessment
        print("🎯 BASELINE ASSESSMENT")
        print("─" * 62)
        avg_dok = baseline['average_dok_score']
        stage = baseline['estimated_stage']
        print(f"Average DOK Score: {avg_dok:.2f}")
        print(f"Estimated Gas Town Stage: Stage {stage} ({self.STAGE_NAMES[stage]})")
        print(f"Domain Breadth: {baseline['domain_count']} unique working directories")
        print()
        
        # Domain Coverage
        domains = baseline.get('domains', {})
        if domains:
            print("🗺️  DOMAIN COVERAGE")
            print("─" * 62)
            for i, (path, info) in enumerate(list(domains.items())[:5], 1):
                short_path = path.replace(str(Path.home()), '~')
                if len(short_path) > 40:
                    short_path = '...' + short_path[-37:]
                print(f"{i}. {short_path:40} - {info['count']} sessions")
            print()
        
        # Insights
        print("💡 BASELINE INSIGHTS")
        print("─" * 62)
        
        # Find dominant DOK
        max_dok = max(range(1, 5), key=lambda x: dist[f'dok{x}'])
        print(f"1. 📊 {dist[f'dok{max_dok}']:.0f}% of your work is DOK {max_dok} ({self.DOK_NAMES[max_dok]})")
        
        # Trajectory insight
        if baseline['trajectory'] == 'improving':
            print("2. 📈 Your cognitive complexity is trending upward - great progress!")
        elif baseline['trajectory'] == 'declining':
            print("2. 📉 DOK trending down - consider taking on more strategic work")
        else:
            print("2. → Your DOK level is stable - push for more DOK 3+ work to grow")
        
        # Stage insight
        if stage == 5 and avg_dok >= 2.5:
            print("3. 🎯 You're showing Stage 6 potential - focus on cross-team impact")
        elif stage == 5:
            print("3. 💡 Opportunity: Ask 'why' and 'what are the trade-offs' more often")
        else:
            print("3. 🌟 Strong strategic thinking - document and share your approaches")
        print()
        
        # Recommendations
        print("🎯 RECOMMENDED FOCUS AREAS")
        print("─" * 62)
        next_stage = min(stage + 1, 7)
        print(f"To progress from Stage {stage} to Stage {next_stage}:")
        
        if dist['dok3'] + dist['dok4'] < 40:
            print("1. Increase DOK 3+ work - ask 'why' before implementing")
        else:
            print("1. Maintain strategic focus - you're doing well on DOK 3+ work")
        
        if baseline['domain_count'] < 3:
            print("2. Expand domain breadth - contribute to 1-2 new areas")
        else:
            print("2. Deepen cross-domain expertise - look for patterns across projects")
        
        print("3. Document your decisions - capture reasoning for organizational learning")
        print()
        
        # Footer
        print("─" * 62)
        print(f"Baseline Generated: {baseline['generated_at'][:19]}")
        print(f"Baseline saved to: {self.BASELINE_FILE}")
        print()
        print("💡 Run /rp-why after sessions to track progress against this baseline.")
        print("💡 Run /rp-why compare to see how your current session compares.")


def main():
    """CLI interface"""
    import sys
    
    analyzer = RPWhyBaseline()
    
    if len(sys.argv) < 2:
        print("Usage: python rp_why_baseline.py [init|compare|export|show]")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'init':
        print("\n🔍 Analyzing your Goose session history...\n")
        baseline = analyzer.generate_baseline()
        
        if baseline and 'error' not in baseline:
            analyzer.save_baseline(baseline)
            analyzer.print_baseline_report(baseline)
        elif baseline:
            print(f"\n❌ {baseline.get('message', 'Unknown error')}")
        else:
            print("\n❌ Failed to generate baseline")
    
    elif command == 'show':
        baseline = analyzer.load_baseline()
        if baseline:
            analyzer.print_baseline_report(baseline)
        else:
            print("\n❌ No baseline found. Run 'python rp_why_baseline.py init' first.")
    
    elif command == 'export':
        baseline = analyzer.load_baseline()
        if baseline:
            print(json.dumps(baseline, indent=2))
        else:
            print("\n❌ No baseline found. Run 'python rp_why_baseline.py init' first.")
    
    elif command == 'compare':
        baseline = analyzer.load_baseline()
        if not baseline:
            print("\n❌ No baseline found. Run 'python rp_why_baseline.py init' first.")
            sys.exit(1)
        
        # For compare, we'd need current session context
        # This is typically called from within Goose with session data
        print("\n⚠️  Compare command is designed to be run from within Goose.")
        print("Use /rp-why compare in your Goose session for full comparison.")
        print("\nShowing baseline summary for reference:")
        print(f"  Baseline DOK: {baseline['average_dok_score']:.2f}")
        print(f"  Stage: {baseline['estimated_stage']}")
        print(f"  Sessions: {baseline['sessions_analyzed']}")
    
    else:
        print(f"Unknown command: {command}")
        print("Usage: python rp_why_baseline.py [init|compare|export|show]")
        sys.exit(1)


if __name__ == '__main__':
    main()


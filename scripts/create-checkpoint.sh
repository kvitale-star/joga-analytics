#!/bin/bash

# Create Checkpoint Script
# Creates a complete safety checkpoint before starting new implementation

set -e  # Exit on error

echo "🔒 Creating Safety Checkpoint..."
echo ""

# Get timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PROJECT_DIR="/Users/kvitale/Desktop/joga-visualizer"

cd "$PROJECT_DIR"

# 1. Git Tag
echo "📌 Step 1: Creating git tag..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        echo "⚠️  Warning: You have uncommitted changes."
        read -p "Commit them now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            git commit -m "Checkpoint: Working version before Coaching Intelligence System implementation"
        fi
    fi
    
    # Create tag
    git tag -a "v1.0-working-checkpoint-$TIMESTAMP" -m "Working version checkpoint before Phase 1-5 implementation"
    echo "✅ Git tag created: v1.0-working-checkpoint-$TIMESTAMP"
else
    echo "⚠️  Warning: Not a git repository. Skipping git tag."
fi

# 2. Database Backup
echo ""
echo "💾 Step 2: Backing up database..."
if [ -f "backend/data/joga.db" ]; then
    BACKUP_FILE="backend/data/joga.db.backup-$TIMESTAMP"
    cp "backend/data/joga.db" "$BACKUP_FILE"
    echo "✅ Database backup created: $BACKUP_FILE"
    echo "   Size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "⚠️  Warning: Database file not found at backend/data/joga.db"
fi

# 3. Code Snapshot (if not using git)
echo ""
echo "📦 Step 3: Creating code snapshot..."
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    PARENT_DIR=$(dirname "$PROJECT_DIR")
    SNAPSHOT_NAME="joga-visualizer-backup-$TIMESTAMP"
    cd "$PARENT_DIR"
    tar -czf "$SNAPSHOT_NAME.tar.gz" joga-visualizer
    echo "✅ Code snapshot created: $PARENT_DIR/$SNAPSHOT_NAME.tar.gz"
    echo "   Size: $(du -h "$SNAPSHOT_NAME.tar.gz" | cut -f1)"
    cd "$PROJECT_DIR"
else
    echo "ℹ️  Skipping code snapshot (using git)"
fi

# 4. Create checkpoint info file
echo ""
echo "📝 Step 4: Creating checkpoint info file..."
CHECKPOINT_INFO="CHECKPOINT-$TIMESTAMP.txt"
cat > "$CHECKPOINT_INFO" << EOF
JOGA Visualizer - Safety Checkpoint
Created: $(date)
Timestamp: $TIMESTAMP

GIT:
$(if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "  Branch: $(git branch --show-current)"
    echo "  Commit: $(git rev-parse HEAD)"
    echo "  Tag: v1.0-working-checkpoint-$TIMESTAMP"
else
    echo "  Not a git repository"
fi)

DATABASE:
$(if [ -f "backend/data/joga.db.backup-$TIMESTAMP" ]; then
    echo "  Backup: backend/data/joga.db.backup-$TIMESTAMP"
    echo "  Size: $(du -h "backend/data/joga.db.backup-$TIMESTAMP" | cut -f1)"
else
    echo "  No backup created"
fi)

CODE SNAPSHOT:
$(if [ -f "../joga-visualizer-backup-$TIMESTAMP.tar.gz" ]; then
    echo "  Snapshot: ../joga-visualizer-backup-$TIMESTAMP.tar.gz"
    echo "  Size: $(du -h "../joga-visualizer-backup-$TIMESTAMP.tar.gz" | cut -f1)"
else
    echo "  No snapshot created (using git)"
fi)

ROLLBACK INSTRUCTIONS:
1. To rollback code: git checkout v1.0-working-checkpoint-$TIMESTAMP
2. To rollback database: cp backend/data/joga.db.backup-$TIMESTAMP backend/data/joga.db
3. See ROLLBACK_SAFETY_GUIDE.md for detailed instructions
EOF

echo "✅ Checkpoint info saved: $CHECKPOINT_INFO"

echo ""
echo "✅ Checkpoint Complete!"
echo ""
echo "📋 Summary:"
echo "   - Git tag: v1.0-working-checkpoint-$TIMESTAMP"
if [ -f "backend/data/joga.db.backup-$TIMESTAMP" ]; then
    echo "   - Database backup: backend/data/joga.db.backup-$TIMESTAMP"
fi
echo "   - Checkpoint info: $CHECKPOINT_INFO"
echo ""
echo "📖 See ROLLBACK_SAFETY_GUIDE.md for rollback instructions"
echo ""

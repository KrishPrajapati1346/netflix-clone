set -e
COMMIT2=$(git rev-parse HEAD)
git checkout HEAD~1
git log --format=%B -n 1 > msg.txt
grep -v "Co-Authored-By: Claude" msg.txt > msg_new.txt
git commit --amend -F msg_new.txt
NEW_ROOT=$(git rev-parse HEAD)
git checkout master
git reset --hard $NEW_ROOT
git cherry-pick $COMMIT2
git push -f origin master
rm msg.txt msg_new.txt remove_claude.sh

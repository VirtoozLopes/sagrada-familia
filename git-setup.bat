@echo off
set "GITPATH=C:\Program Files\Git\cmd"
set "PATH=%GITPATH%;%PATH%"
cd /d "c:\Users\victo\Documents\pecas-order-system"
git config user.email "victoraugustolg@hotmail.com"
git config user.name "Victor"
git add .
git commit -m "Deploy inicial Sagrada Familia"
git branch -M main
echo DONE

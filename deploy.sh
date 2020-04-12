# !/bin/bash

git add .
read -p "Enter Commit Message: "  commit
git commit -m "$commit"
git push heroku master
printf "\n\n\n❤️  Deployed to Heroku!  ❤️\n\n\n"
heroku logs --tail
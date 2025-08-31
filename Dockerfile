FROM  birendramondal/daemon_monitor:frontend_v-latest

COPY /build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
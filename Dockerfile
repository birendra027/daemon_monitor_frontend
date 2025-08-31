FROM  birendramondal/daemon_monitor:frontend_v1.0

COPY /build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
package com.observability.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for trace data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TraceResponse {

    private Long id;
    private String traceId;
    private Long startTime;
    private Long endTime;
    private Long duration;
    private String serviceName;
    private String status;
    private String rootOperation;
    private Integer spanCount;
    private List<SpanResponse> spans;
}

